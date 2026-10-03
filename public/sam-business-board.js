/* 事業版圖 V1（輕量戰略盤）資料邏輯
 * 正本：sam_data.json → business_ops.board（經 GET/POST /api/sam-progress 的 business_ops key 讀寫，
 * 與既有關聯圖 business_ops.graph 同一份正本，不另建平行資料）。
 * 每列以 node_id 對應關聯圖節點（一節點最多一列）；node_id 為 null 的列是「手動新增、非圖節點」的例外列。
 * 每格只有一種標記：fact（事實，必須有來源）／suggestion（Sam 建議）／confirmed（HY 已確認）／unknown（待補）。
 * 純函式、無 DOM，瀏覽器以 window.SamBusinessBoard 使用，tests/ 以 vm 載入測試。
 */
(function (root) {
  'use strict'

  var SCHEMA = 'business-board-v1'
  var ROOT_NODE_ID = 'sam'
  var COLUMNS = [
    { key: 'what', label: '做什麼' },
    { key: 'stage', label: '目前階段' },
    { key: 'cashflow', label: '現金流概況' },
    { key: 'blocker', label: '主要卡點' },
    { key: 'next', label: '下一步' },
  ]
  var KINDS = { fact: '事實', suggestion: 'Sam 建議', confirmed: 'HY 已確認', unknown: '待補' }
  var NODE_STATUS = { active: '有效／推進中', potential: '潛在資源', paused: '暫停推進', inactive: '已失效', archived: '已封存', candidate: '候選' }

  function nowIso() { return new Date().toISOString() }
  function str(v) { return v == null ? '' : String(v).trim() }

  function emptyCell() { return { text: '', kind: 'unknown', source: '' } }

  function normalizeCell(cell) {
    var c = cell && typeof cell === 'object' ? cell : {}
    var text = str(c.text)
    var kind = KINDS[c.kind] ? c.kind : 'unknown'
    var source = str(c.source)
    if (!text) kind = 'unknown'
    var out = { text: text, kind: kind, source: source }
    if (c.confirmed_at && kind === 'confirmed') out.confirmed_at = c.confirmed_at
    if (c.updated_at) out.updated_at = c.updated_at
    return out
  }

  /** 檢查一格能否存檔；回傳錯誤訊息或空字串。 */
  function validateCell(cell) {
    var c = normalizeCell(cell)
    if (c.kind === 'fact' && !c.source) return '事實需要來源；沒有來源請改成「待補」或「Sam 建議」'
    return ''
  }

  function emptyFocus() { return { text: '', kind: 'unknown', source: '' } }

  /** 確保 business_ops.board 存在且欄位完整（就地補齊，不覆蓋既有值）。 */
  function ensureBoard(businessOps) {
    var ops = businessOps
    if (!ops.board || typeof ops.board !== 'object') ops.board = {}
    var b = ops.board
    b.schema_version = b.schema_version || SCHEMA
    b.week_focus = b.week_focus && typeof b.week_focus === 'object' ? normalizeCell(b.week_focus) : emptyFocus()
    b.quarter_focus = b.quarter_focus && typeof b.quarter_focus === 'object' ? normalizeCell(b.quarter_focus) : emptyFocus()
    b.last_review_at = str(b.last_review_at)
    b.excluded_node_ids = Array.isArray(b.excluded_node_ids) ? b.excluded_node_ids.filter(Boolean) : []
    b.rows = Array.isArray(b.rows) ? b.rows : []
    b.rows.forEach(function (r) {
      r.cells = r.cells && typeof r.cells === 'object' ? r.cells : {}
      COLUMNS.forEach(function (col) { r.cells[col.key] = normalizeCell(r.cells[col.key]) })
      r.node_id = r.node_id || null
      r.focus = r.focus === true
    })
    return b
  }

  /** 從關聯圖節點既有事實帶出預設列（未存檔的「虛擬列」）。只帶有來源的事實，其餘待補。 */
  function deriveRowFromNode(node) {
    var name = str(node.name) || node.id
    var src = '事業版圖節點「' + name + '」'
    var cells = {}
    COLUMNS.forEach(function (col) { cells[col.key] = emptyCell() })
    var industry = str(node.industry)
    var products = Array.isArray(node.products_services) ? node.products_services.join('、') : str(node.products_services)
    if (industry || products) cells.what = { text: [industry, products].filter(Boolean).join('：'), kind: 'fact', source: src + '・產業／產品' }
    var status = str(node.status)
    if (status) cells.stage = { text: NODE_STATUS[status] || status, kind: 'fact', source: src + '・節點狀態' }
    return { id: 'row_' + node.id, node_id: node.id, focus: false, cells: cells, virtual: true }
  }

  /**
   * 圖驅動列：每個圖節點（不含根節點 Sam、不含已移除的節點）一列，存檔列優先，否則用節點既有事實帶出虛擬列；
   * 再加上手動列（node_id=null）與節點已刪除的孤兒列（orphan=true）。本週焦點列置頂。
   */
  function boardRows(graph, board) {
    var nodes = (graph && Array.isArray(graph.nodes) ? graph.nodes : []).filter(function (n) { return n && n.id && n.id !== ROOT_NODE_ID })
    var nodeIds = new Set(nodes.map(function (n) { return n.id }))
    var excluded = new Set(board.excluded_node_ids || [])
    var stored = new Map()
    var others = []
    ;(board.rows || []).forEach(function (r) {
      if (r.node_id && nodeIds.has(r.node_id)) { if (!stored.has(r.node_id)) stored.set(r.node_id, r) }
      else others.push(r)
    })
    var out = []
    nodes.forEach(function (n) {
      if (excluded.has(n.id)) return
      var r = stored.get(n.id) || deriveRowFromNode(n)
      out.push(Object.assign({}, r, { name: str(n.name) || n.id, from_graph: true }))
    })
    others.forEach(function (r) {
      out.push(Object.assign({}, r, { name: str(r.name) || '未命名', from_graph: false, orphan: !!r.node_id }))
    })
    out.forEach(function (r, i) { r._order = i })
    out.sort(function (a, b) { return (b.focus === true) - (a.focus === true) || a._order - b._order })
    out.forEach(function (r) { delete r._order })
    return out
  }

  function findStored(board, rowId) { return (board.rows || []).find(function (r) { return r.id === rowId }) || null }

  /** 把虛擬列寫進 board.rows（第一次編輯時），回傳存檔列。 */
  function materialize(board, row) {
    var existing = findStored(board, row.id)
    if (existing) return existing
    var cells = {}
    COLUMNS.forEach(function (col) { cells[col.key] = normalizeCell(row.cells && row.cells[col.key]) })
    var stored = { id: row.id, node_id: row.node_id || null, focus: row.focus === true, cells: cells, updated_at: nowIso() }
    if (!row.node_id) stored.name = str(row.name)
    board.rows.push(stored)
    return stored
  }

  /**
   * 更新一列（patch：{name?, focus?, cells?:{key:{text,kind,source}}}）。
   * HY 在待補格填字且沒選標記 → 視為 HY 已確認。事實缺來源 → 拋錯。
   */
  function updateRow(board, row, patch) {
    var errors = []
    var cellsPatch = (patch && patch.cells) || {}
    Object.keys(cellsPatch).forEach(function (k) {
      var c = Object.assign({}, cellsPatch[k])
      if (str(c.text) && (!c.kind || c.kind === 'unknown')) c.kind = 'confirmed'
      var err = validateCell(c)
      if (err) errors.push((COLUMNS.find(function (col) { return col.key === k }) || { label: k }).label + '：' + err)
      cellsPatch[k] = c
    })
    if (errors.length) throw new Error(errors.join('\n'))
    var stored = materialize(board, row)
    var ts = nowIso()
    Object.keys(cellsPatch).forEach(function (k) {
      var prev = stored.cells[k] || emptyCell()
      var next = normalizeCell(cellsPatch[k])
      if (next.kind === 'confirmed') next.confirmed_at = prev.kind === 'confirmed' && prev.text === next.text && prev.confirmed_at ? prev.confirmed_at : ts
      if (prev.text !== next.text || prev.kind !== next.kind || prev.source !== next.source) next.updated_at = ts
      else if (prev.updated_at) next.updated_at = prev.updated_at
      stored.cells[k] = next
    })
    if (patch && 'focus' in patch) stored.focus = patch.focus === true
    if (patch && 'name' in patch && !stored.node_id) stored.name = str(patch.name) || stored.name
    stored.updated_at = ts
    return stored
  }

  /** HY 確認一列裡所有 Sam 建議。回傳確認了幾格。 */
  function confirmSuggestions(board, row) {
    var count = COLUMNS.filter(function (col) { return row.cells && row.cells[col.key] && row.cells[col.key].kind === 'suggestion' }).length
    if (!count) return 0
    var stored = materialize(board, row)
    var ts = nowIso()
    COLUMNS.forEach(function (col) {
      var c = stored.cells[col.key]
      if (c && c.kind === 'suggestion') { c.kind = 'confirmed'; c.confirmed_at = ts; c.updated_at = ts }
    })
    stored.updated_at = ts
    return count
  }

  function addManualRow(board, name) {
    var cells = {}
    COLUMNS.forEach(function (col) { cells[col.key] = emptyCell() })
    var id = 'row_manual_' + ((root.crypto && root.crypto.randomUUID && root.crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2, 6))
    var row = { id: id, node_id: null, name: str(name) || '未命名', focus: false, cells: cells, updated_at: nowIso() }
    board.rows.push(row)
    return row
  }

  /** 刪除一列。圖節點列會記進 excluded_node_ids，不會被自動帶回；節點本身不受影響。 */
  function removeRow(board, row) {
    board.rows = (board.rows || []).filter(function (r) { return r.id !== row.id })
    if (row.from_graph && row.node_id && board.excluded_node_ids.indexOf(row.node_id) < 0) board.excluded_node_ids.push(row.node_id)
  }

  function restoreNodeRow(board, nodeId) {
    board.excluded_node_ids = (board.excluded_node_ids || []).filter(function (id) { return id !== nodeId })
  }

  function setFocus(board, which, cell) {
    var c = Object.assign({}, cell)
    if (str(c.text) && (!c.kind || c.kind === 'unknown')) c.kind = 'confirmed'
    var err = validateCell(c)
    if (err) throw new Error(err)
    var next = normalizeCell(c)
    next.updated_at = nowIso()
    if (next.kind === 'confirmed') next.confirmed_at = next.updated_at
    board[which] = next
    return next
  }

  function markReviewed(board, when) { board.last_review_at = when || nowIso(); return board.last_review_at }

  function counts(rows) {
    var c = { suggestion: 0, unknown: 0, rows: rows.length }
    rows.forEach(function (r) {
      COLUMNS.forEach(function (col) {
        var k = r.cells && r.cells[col.key] ? r.cells[col.key].kind : 'unknown'
        if (k === 'suggestion') c.suggestion++
        if (k === 'unknown') c.unknown++
      })
    })
    return c
  }

  root.SamBusinessBoard = {
    SCHEMA: SCHEMA, ROOT_NODE_ID: ROOT_NODE_ID, COLUMNS: COLUMNS, KINDS: KINDS,
    normalizeCell: normalizeCell, validateCell: validateCell, ensureBoard: ensureBoard,
    deriveRowFromNode: deriveRowFromNode, boardRows: boardRows, materialize: materialize,
    updateRow: updateRow, confirmSuggestions: confirmSuggestions, addManualRow: addManualRow,
    removeRow: removeRow, restoreNodeRow: restoreNodeRow, setFocus: setFocus,
    markReviewed: markReviewed, counts: counts,
  }
})(typeof window !== 'undefined' ? window : globalThis)
