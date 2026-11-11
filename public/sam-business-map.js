/* 事業版圖 v2（滿版關聯圖）資料邏輯
 * 正本：sam_data.json → business_ops.map_v2（經 GET/POST /api/sam-progress 的 business_ops key 讀寫）。
 * 舊的 business_ops.graph／business_ops.board 原封不動保留在正本裡，本頁不讀、不畫、不刪。
 * 白名單：HY 中心＋四家公司＋使用者之後新增的人物／資源。規格：/workspace/sam-companies/business-map-page-plan-v0.md
 * 純函式、無 DOM，瀏覽器以 window.SamBusinessMap 使用，tests/ 以 vm 載入測試。
 */
(function (root) {
  'use strict'

  var SCHEMA = 'business-map-v2'
  var HY_ID = 'hy'
  var STALE_DAYS = 90
  var UNKNOWN = '未知'
  var STATUSES = ['賺', '平', '虧', '未知']
  var KINDS = { hy: '中心', company: '公司', person: '人物', resource: '資源' }
  var EDGE_TYPES = ['隱名股東', '持股', '投資', '合作', '供應', '通路', '人脈', '使用', '其他']
  var COMPANY_IDS = ['lechuan', 'rm', 'shangmiao', 'divios']
  var HIDDEN_ROLE = '隱名股東（登記上不會出現 HY 名字）'

  /* 欄位定義：key、標籤、是否多行。順序即面板與表單順序。 */
  var FIELDS = {
    company: [
      { sec: '基本' },
      { key: 'name', label: '顯示名稱', required: true },
      { key: 'legal_name', label: '法律主體名稱' },
      { key: 'legal_state', label: '法律主體', options: ['已確認', '待確認', '未知'] },
      { key: 'status', label: '近三月狀態', options: STATUSES },
      { key: 'status_source', label: '狀態來源' },
      { sec: '公開登記' },
      { key: 'tax_id', label: '統一編號' },
      { key: 'registry', label: '登記資料', multi: true, hint: '一行一項，例如「登記現況：核准設立」。查不到寫未知。' },
      { sec: '持股與角色' },
      { key: 'stake_role', label: '角色' },
      { key: 'stake_ratio', label: '比例' },
      { key: 'stake_via', label: '透過誰持有' },
      { key: 'stake_written', label: '書面約定' },
      { key: 'stake_invested', label: '投入' },
      { key: 'stake_note', label: '說明', multi: true },
      { sec: '收入來源' },
      { key: 'income_actual', label: '實際（有憑證）', multi: true },
      { key: 'income_leads', label: '線索', multi: true },
      { key: 'income_unknown', label: '未知', multi: true },
      { sec: '支出與缺口' },
      { key: 'costs', label: '固定與變動支出', multi: true },
      { key: 'gaps', label: '資金與帳務缺口', multi: true },
      { sec: '待問 HY' },
      { key: 'questions', label: '待問（一行一題）', multi: true },
      { sec: '來源與維護' },
      { key: 'sources', label: '來源清單（一行一項）', multi: true },
      { key: 'maintainer', label: '維護者' },
      { key: 'followup_due', label: '約定補件日', type: 'date' },
    ],
    person: [
      { sec: '基本' },
      { key: 'name', label: '顯示名稱（可用稱呼）', required: true },
      { key: 'relation', label: '與 HY 的關係', options: ['家人', '合夥人', '負責人', '同事', '顧問', '客戶', '其他', '未知'] },
      { key: 'role', label: '角色或專長' },
      { key: 'origin', label: '認識來源與時機' },
      { key: 'cadence', label: '互動節奏或聯絡原則' },
      { key: 'why', label: '為何重要' },
      { key: 'notes', label: '注意事項／待補', multi: true },
      { sec: '來源與維護' },
      { key: 'sources', label: '來源', multi: true },
      { key: 'maintainer', label: '維護者' },
    ],
    resource: [
      { sec: '基本' },
      { key: 'name', label: '名稱', required: true },
      { key: 'rtype', label: '類型', options: ['產能', '據點', '通路', '設備', '知識', '其他', '未知'] },
      { key: 'location', label: '所在地' },
      { key: 'ownership', label: '歸屬或可用權限', options: ['自有', '可使用', '合作', '未知'] },
      { key: 'capability', label: '能力說明', multi: true },
      { key: 'limits', label: '限制或成本', multi: true },
      { key: 'state', label: '目前狀態', options: ['可用', '暫停', '未知'] },
      { sec: '來源與維護' },
      { key: 'sources', label: '來源', multi: true },
      { key: 'maintainer', label: '維護者' },
    ],
  }

  function str(v) { return v == null ? '' : String(v).trim() }
  function nowIso() { return new Date().toISOString() }
  function uid(prefix) {
    var r = (root.crypto && root.crypto.randomUUID && root.crypto.randomUUID()) || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8))
    return prefix + '_' + String(r).replace(/-/g, '').slice(0, 12)
  }
  /** 空白一律顯示「未知」；不把空值寫成 0。 */
  function show(v) { var s = str(v); return s || UNKNOWN }

  var SEED_DATE = '2026-11-11T08:00:00.000Z' // 公司資料草稿 v0 整理日 2026-11-11（台北）

  function seedCompanies() {
    return [
      {
        id: 'lechuan', kind: 'company', name: '樂川', legal_name: '樂川國際股份有限公司', legal_state: '已確認',
        status: '未知', status_source: '115 年 5–6 月申報為 0，只證明該期，不外推（Nana 主檔）',
        tax_id: '60345469',
        registry: [
          '公司名稱：樂川國際股份有限公司（HY 2026-11-11 確認）',
          '登記現況：核准設立',
          '核准設立日：115-02-09（2026-02-09）',
          '資本總額／實收資本額：各新臺幣 100,000 元（登記資本，不是帳戶現金）',
          '代表人：葉予暄（董事長，登記持有 10,000 股）。登記負責人／董監不代表 HY 的權益',
          '監察人：邱姵嘉（登記持股 0）',
          '地址：新竹縣竹北市新社里國盛街337號4樓之2',
          '登記機關：商業發展署（南投辦公區）',
          '最後核准變更日：空白',
          '營業項目、稅籍、經理人、董監任期：見 Nana 主檔',
          '易混淆：「樂川股份有限公司」70837087 不是本對象',
        ].join('\n'),
        stake_role: HIDDEN_ROLE, stake_ratio: UNKNOWN, stake_via: UNKNOWN, stake_written: UNKNOWN + '（Drive 有借名登記／股權讓渡草稿，姓名與簽章空白，不當作已生效）', stake_invested: UNKNOWN,
        stake_note: '公開登記的負責人／董監不代表 HY 的權益，不可據此反推持股。',
        income_actual: '115 年 5–6 月 401 申報銷售額 0、進項 0、發票 0 份（只證明該期）。',
        income_leads: '銀角電商（HY 說是其中一個收入；2026-11-11 仍未開通，無訂單或撥款）；其他線見 Nana 主檔。',
        income_unknown: '7 月以後各期申報、公司現金與銀行餘額、近三月賺或虧。',
        costs: '會計費新臺幣 1,000 元／月（內部交代，無帳單、起始月未知）。其餘未知。',
        gaps: '應收應付、現金餘額未知；完整缺口見 Nana 主檔 §3–§5。',
        questions: [
          '在 60345469 的帳上，銀角以外現在實際還有哪些已入帳或應入本公司的收入？7–8 月與 9–10 月營業稅是否已申報？',
          '公司現在的現金或台新帳戶餘額大概是多少？',
          '隱名股權是透過誰持有、比例多少、有無書面約定？',
        ].join('\n'),
        sources: [
          'Nana 主檔 /workspace/lechuan-company-scan-2026-11-11/company-status.md（2026-11-11）',
          '經濟部開放資料 API（基本資料＋董監事），2026-11-11',
          '使用者 2026-11-11 16:51 口述：隱名入股',
        ].join('\n'),
        maintainer: 'Nana', maintainer_note: '樂川公司卡由 Nana 維護，以 Nana 主檔為準',
        followup_due: '', updated_at: SEED_DATE,
      },
      {
        id: 'rm', kind: 'company', name: 'RM 餐酒館', legal_name: '待確認：宇陽餐酒館（93080582）或宇陽餐酒有限公司（96677727）', legal_state: '待確認',
        status: '未知', status_source: '沒有入帳憑證或近三月數字',
        tax_id: '待確認（候選 93080582／96677727）',
        registry: [
          '對應的店（待你確認）：RM Restaurant Bar 餐酒館，新竹縣竹北市勝利十二街28號（Uber Eats、Facebook 店頁）',
          'A. 宇陽餐酒館｜93080582｜合夥｜核准設立 113-05-17｜資本額 100,000 元（登記資本）｜負責人尤敏柔、合夥人趙幼喬｜新竹縣政府（g0v 商工鏡像，二手）',
          'B. 宇陽餐酒有限公司｜96677727｜核准設立 113-08-02｜資本總額 1,000,000 元、實收資本額欄位 0（只記欄位值）｜代表人尤敏柔、董事趙幼喬｜商業發展署（經濟部 API）',
          '兩家同址：新竹縣竹北市北興里勝利十二街28號1樓',
          '登記負責人／合夥人／董事不代表 HY 的權益',
        ].join('\n'),
        stake_role: HIDDEN_ROLE, stake_ratio: UNKNOWN, stake_via: UNKNOWN, stake_written: UNKNOWN, stake_invested: UNKNOWN,
        stake_note: '店與法律主體仍待確認；權利對 93080582、96677727 或兩者，未知。',
        income_actual: '無（沒有申報書、水單或近三月數字）。',
        income_leads: '店仍有公開店頁與外送頁，不能據此推營收。舊敘述「竹北據點大致打平」沒有點名 RM，不套用。',
        income_unknown: '近三月收入與賺、平、虧；保證或分成。',
        costs: UNKNOWN, gaps: '尚未確認勝利十二街這家就是版圖上的 RM；確認後仍要分清兩張統編。',
        questions: [
          '你說的 RM 餐酒館，是不是竹北市勝利十二街28號這一家？',
          '隱名股權透過誰持有、比例多少、有無書面約定？權利是對 93080582、96677727，還是兩家都有？',
          '近三個月大概是賺、打平，還是虧？',
        ].join('\n'),
        sources: [
          'Uber Eats 店頁、Facebook RM036688707（2026-11-11 查）',
          'g0v 商工鏡像（宇陽餐酒館，二手）；經濟部開放資料 API（96677727），2026-11-11',
          '使用者 2026-11-11 16:51 口述：隱名入股',
        ].join('\n'),
        maintainer: 'Sam', followup_due: '', updated_at: SEED_DATE,
      },
      {
        id: 'shangmiao', kind: 'company', name: '上淼', legal_name: UNKNOWN + '（尚未認定；「上淼時尚企業社」只是名稱接近的候選）', legal_state: '未知',
        status: '未知', status_source: '沒有入帳憑證或近三月數字',
        tax_id: UNKNOWN,
        registry: [
          '正式名稱、統編、代表人、資本額：未知（以「上淼」查到 5 筆，沒有一筆能直接認定）',
          '名稱最接近的候選：上淼時尚企業社 61285778，新北市蘆洲區，獨資，2026-08-27 設立——獨資結構與「約 45%」合不攏，不採為定論',
          '其餘同名：上淼製作有限公司（廢止）、上淼企業有限公司 ×2（解散／撤銷）、上淼商行（歇業）',
        ].join('\n'),
        stake_role: HIDDEN_ROLE, stake_ratio: '約 45%（內部約數，非正式股權文件）', stake_via: UNKNOWN, stake_written: UNKNOWN, stake_invested: UNKNOWN,
        stake_note: '「具有一定影響與掌控能力」，未過半（內部敘述）。',
        income_actual: '無申報書、發票或水單。',
        income_leads: '新北成衣「已實際接單」，但「不是自由現金」；看板曾有「接手成衣廠業務」due 2026-12-02。沒有金額。',
        income_unknown: '營收、毛利、帳期、錢卡在哪。',
        costs: UNKNOWN, gaps: '沒有可確信的統編，45% 只有約數，近三月沒有數字。',
        questions: [
          '上淼的正式登記名稱與統編是什麼？（是否為上淼時尚企業社 61285778？那是獨資，和約 45% 怎麼對？）',
          '約 45% 是透過誰持有、有無書面約定？其餘權益人是誰？',
          '近三個月大概收多少，是賺、打平，還是虧？「不是自由現金」卡在哪？',
        ].join('\n'),
        sources: [
          'Sam 長期記憶；/workspace/sam-kb/kb_v0.md 3-06；/workspace/sam-evening/2026-11-10.json（內部敘述）',
          'g0v 商工鏡像「上淼」查詢，2026-11-11（二手）',
          '使用者 2026-11-11 16:51 口述：隱名入股',
        ].join('\n'),
        maintainer: 'Sam', followup_due: '', updated_at: SEED_DATE,
      },
      {
        id: 'divios', kind: 'company', name: '迪繆斯 DIVIOS', legal_name: '待確認候選：帝爾股份有限公司（90895872）', legal_state: '待確認',
        status: '未知', status_source: '沒有入帳憑證或近三月數字',
        tax_id: '待確認（候選 90895872）',
        registry: [
          '公開登記名稱沒有「迪繆斯」或「DIVIOS」；最接近的候選是帝爾股份有限公司（待你確認）',
          '帝爾｜90895872｜核准設立（案件狀態欄「復業」，只照錄）｜核准設立 110-05-17',
          '資本總額／實收資本額：各新臺幣 8,300,000 元（登記資本，不是帳戶現金）',
          '代表人：劉姿廷（董事長）；董事鄭有倫、林秋翠；監察人王忻瀅（官方董監事 API）。登記董監不代表 HY 的權益',
          '現登記地址：臺中市西區四維街5號（2024-03 起曾登記南港園區街58巷5號1樓，二手歷程）',
          '登記機關：臺中市政府；最後核准變更日 115-07-01',
          '品牌寫 2019 成立，公司 2021 才核准設立，時間不一致，本次不選邊',
        ].join('\n'),
        stake_role: HIDDEN_ROLE, stake_ratio: UNKNOWN, stake_via: UNKNOWN, stake_written: UNKNOWN, stake_invested: UNKNOWN,
        stake_note: '帝爾是否為主體仍待確認；董監持股表加總不等於資本總額，不可反推比例。',
        income_actual: '無（本公司憑證）。',
        income_leads: '品牌有門市（南港旗艦店、台中街邊店、美麗華專櫃）、課程與選品；媒體轉述「13 萬會員」，不轉成營收。',
        income_unknown: '各門市／專櫃營收、課程收入、公司損益。',
        costs: UNKNOWN + '（租金、專櫃抽成、人事等皆無帳單）', gaps: '法律主體未經你點頭；持股比例未知；近三月沒有數字。',
        questions: [
          '迪繆斯 DIVIOS 的公司，是不是帝爾股份有限公司（90895872）？若不是，正式名稱與統編是什麼？',
          '隱名股權透過誰持有、比例多少、有無書面約定？',
          '近三個月大概是賺、打平，還是虧？2019 品牌到 2021 公司之間是否還有別的主體？',
        ].join('\n'),
        sources: [
          '官網 diviosartgallery.easy.co；《警政時報》2025-10-13；誠品合作品牌頁（2026-11-11 讀回）',
          '經濟部開放資料 API（90895872 基本資料＋董監事），2026-11-11；twfile 歷程（二手）',
          '使用者 2026-11-11 16:51 口述：隱名入股',
        ].join('\n'),
        maintainer: 'Sam', followup_due: '', updated_at: SEED_DATE,
      },
    ]
  }

  function seedEdges() {
    var notes = { lechuan: '比例未知', rm: '比例未知；店與法律主體仍待確認', shangmiao: '約 45%（內部約數）', divios: '比例未知；帝爾是否為主體仍待確認' }
    return COMPANY_IDS.map(function (id) {
      return { id: 'e_hy_' + id, from: HY_ID, to: id, type: '隱名股東', note: notes[id], via: UNKNOWN, written: UNKNOWN, confirmed: true, source: '使用者 2026-11-11 16:51「我都是隱名入股」', updated_at: SEED_DATE }
    })
  }

  function seed() {
    var nodes = [{ id: HY_ID, kind: 'hy', name: 'HY', maintainer: 'HY', updated_at: SEED_DATE }].concat(seedCompanies())
    return { schema_version: SCHEMA, seeded_from: 'company-profiles-v0（2026-11-11）', nodes: nodes, edges: seedEdges(), updated_at: SEED_DATE }
  }

  /** 取得（必要時建立）map_v2。舊 graph／board 不讀也不改。回傳 {map, seeded}. */
  function ensureMap(businessOps) {
    var seeded = false
    if (!businessOps.map_v2 || typeof businessOps.map_v2 !== 'object' || !Array.isArray(businessOps.map_v2.nodes)) {
      businessOps.map_v2 = seed(); seeded = true
    }
    var m = businessOps.map_v2
    m.edges = Array.isArray(m.edges) ? m.edges : []
    // 白名單：只留 hy／company／person／resource 四種
    m.nodes = m.nodes.filter(function (n) { return n && n.id && KINDS[n.kind] })
    if (!m.nodes.some(function (n) { return n.id === HY_ID })) m.nodes.unshift({ id: HY_ID, kind: 'hy', name: 'HY', updated_at: nowIso() })
    var ids = new Set(m.nodes.map(function (n) { return n.id }))
    m.edges = m.edges.filter(function (e) { return e && ids.has(e.from) && ids.has(e.to) && e.from !== e.to })
    m.nodes.forEach(function (n) { if (n.kind === 'company' && STATUSES.indexOf(n.status) < 0) n.status = UNKNOWN })
    return { map: m, seeded: seeded }
  }

  function getNode(map, id) { return map.nodes.find(function (n) { return n.id === id }) || null }
  function companies(map) { return map.nodes.filter(function (n) { return n.kind === 'company' }) }

  /** 頂欄：每家公司的狀態，只有賺／平／虧／未知。 */
  function statusSummary(map) {
    return companies(map).map(function (n) { return { id: n.id, name: str(n.name) || n.id, status: STATUSES.indexOf(n.status) >= 0 ? n.status : UNKNOWN } })
  }

  function cleanFields(kind, patch) {
    var out = {}
    ;(FIELDS[kind] || []).forEach(function (f) { if (f.key && patch && f.key in patch) out[f.key] = str(patch[f.key]) })
    if (kind === 'company' && out.status !== undefined && STATUSES.indexOf(out.status) < 0) out.status = UNKNOWN
    return out
  }

  function addNode(map, kind, patch) {
    if (['company', 'person', 'resource'].indexOf(kind) < 0) throw new Error('只能新增公司、人物或資源')
    var fields = cleanFields(kind, patch)
    if (!fields.name) throw new Error('請填名稱')
    var n = Object.assign({ id: uid(kind), kind: kind }, fields)
    if (kind === 'company') {
      n.status = n.status || UNKNOWN
      n.stake_role = n.stake_role || ''
    }
    n.maintainer = n.maintainer || (kind === 'company' ? 'Sam' : 'HY')
    n.updated_at = nowIso()
    map.nodes.push(n)
    map.updated_at = n.updated_at
    return n
  }

  function updateNode(map, id, patch) {
    var n = getNode(map, id)
    if (!n) throw new Error('找不到這張卡')
    if (n.kind === 'hy') throw new Error('HY 中心不能編輯')
    var fields = cleanFields(n.kind, patch)
    if ('name' in fields && !fields.name) throw new Error('請填名稱')
    Object.assign(n, fields)
    n.updated_at = nowIso()
    map.updated_at = n.updated_at
    return n
  }

  /** 刪除卡片時，相連的關係一併刪除；回傳被刪的關係數。 */
  function removeNode(map, id) {
    if (id === HY_ID) throw new Error('HY 中心不能刪除')
    var before = map.edges.length
    map.nodes = map.nodes.filter(function (n) { return n.id !== id })
    map.edges = map.edges.filter(function (e) { return e.from !== id && e.to !== id })
    map.updated_at = nowIso()
    return before - map.edges.length
  }

  function edgesOf(map, id) { return map.edges.filter(function (e) { return e.from === id || e.to === id }) }

  function addEdge(map, from, to, patch) {
    if (!getNode(map, from) || !getNode(map, to)) throw new Error('兩端都要是圖上的卡')
    if (from === to) throw new Error('不能連到自己')
    var p = patch || {}
    var e = {
      id: uid('e'), from: from, to: to, type: EDGE_TYPES.indexOf(p.type) >= 0 ? p.type : '其他', note: str(p.note),
      via: str(p.via), written: str(p.written), confirmed: p.confirmed === true, source: str(p.source), updated_at: nowIso(),
    }
    map.edges.push(e)
    map.updated_at = e.updated_at
    return e
  }

  function updateEdge(map, id, patch) {
    var e = map.edges.find(function (x) { return x.id === id })
    if (!e) throw new Error('找不到這條關係')
    var p = patch || {}
    if ('type' in p) e.type = EDGE_TYPES.indexOf(p.type) >= 0 ? p.type : '其他'
    ;['note', 'via', 'written', 'source'].forEach(function (k) { if (k in p) e[k] = str(p[k]) })
    if ('confirmed' in p) e.confirmed = p.confirmed === true
    e.updated_at = nowIso()
    map.updated_at = e.updated_at
    return e
  }

  function removeEdge(map, id) { map.edges = map.edges.filter(function (e) { return e.id !== id }); map.updated_at = nowIso() }

  /** 線上標籤：類型＋說明，例如「隱名股東（約 45%）」。比例未知寫「未知」，不填假數字。 */
  function edgeLabel(e) {
    var note = str(e.note)
    var short = note.split(/[；;]/)[0]
    if (e.type === '隱名股東' || e.type === '持股') {
      if (!short || /未知/.test(short)) short = UNKNOWN
      else short = short.replace(/（內部約數）|\(內部約數\)/, '')
    }
    var s = (e.type || '其他') + (short ? '（' + short + '）' : '')
    return e.confirmed === true ? s : s + '・未確認'
  }

  /** 卡片副標：公司顯示持股角色與比例。 */
  function nodeSubtitle(n) {
    if (n.kind === 'company') {
      var ratio = str(n.stake_ratio).replace(/（.*$/, '')
      var role = /隱名/.test(str(n.stake_role)) ? '隱名股東' : (str(n.stake_role).replace(/（.*$/, '') || '角色未知')
      return role + '，' + (!ratio || ratio === UNKNOWN ? '比例未知' : ratio)
    }
    if (n.kind === 'person') return str(n.role) || str(n.relation) || ''
    if (n.kind === 'resource') return [str(n.rtype), str(n.location)].filter(Boolean).join('・')
    return ''
  }

  /**
   * 過期變灰：最後更新超過 90 天；或公司卡關鍵欄位（近三月狀態、統編）仍未知且已過約定補件日。
   * 變灰只表示資料舊或不全，不是虧損，也不改頂欄狀態。
   */
  function staleness(n, now) {
    if (!n || n.kind === 'hy') return { stale: false, reasons: [] }
    var t = now instanceof Date ? now : new Date(now || Date.now())
    var reasons = []
    var u = Date.parse(n.updated_at || '')
    if (!isFinite(u)) reasons.push('沒有更新日期')
    else if ((t - u) / 86400000 > STALE_DAYS) reasons.push('超過 ' + STALE_DAYS + ' 天沒更新')
    if (n.kind === 'company' && str(n.followup_due)) {
      var due = Date.parse(n.followup_due + 'T23:59:59+08:00')
      var keyUnknown = (str(n.status) || UNKNOWN) === UNKNOWN || !/^\d{8}$/.test(str(n.tax_id))
      if (isFinite(due) && t > due && keyUnknown) reasons.push('關鍵欄位仍未知，已過補件日 ' + n.followup_due)
    }
    return { stale: reasons.length > 0, reasons: reasons }
  }

  /**
   * 預設佈局（世界座標，HY 在 0,0）：公司均分第一圈，人物與資源均分外圈。
   * aspect = 畫布寬/高，用來把圈拉成橢圓以吃滿畫面。手動拖過的卡（n.pos）保留原位。
   */
  function layout(map, aspect) {
    var a = Math.max(0.4, Math.min(3, aspect || 1.6))
    var ax = Math.max(0.85, Math.min(1.6, Math.sqrt(a)))
    var ay = Math.max(0.85, Math.min(1.6, 1 / Math.sqrt(a)))
    var R1 = 250, R2 = 470
    var pos = {}
    var comps = map.nodes.filter(function (n) { return n.kind === 'company' })
    var outer = map.nodes.filter(function (n) { return n.kind === 'person' || n.kind === 'resource' })
    // 直式畫面（手機）把第一圈轉 45°，讓左右兩張公司卡與 HY 之間留得下關係標籤
    var base = a < 1 ? 45 : 0
    function ring(list, R, offset, minX) {
      list.forEach(function (n, i) {
        var ang = (-90 + offset + (360 / Math.max(1, list.length)) * i) * Math.PI / 180
        pos[n.id] = { x: Math.round(Math.cos(ang) * Math.max(R * ax, minX)), y: Math.round(Math.sin(ang) * R * ay) }
      })
    }
    ring(comps, R1, base, 300)
    ring(outer, R2, base + (comps.length ? 180 / Math.max(comps.length, outer.length) : 0), 520)
    map.nodes.forEach(function (n) {
      if (n.kind === 'hy') pos[n.id] = { x: 0, y: 0 }
      if (n.pos && isFinite(n.pos.x) && isFinite(n.pos.y)) pos[n.id] = { x: Number(n.pos.x), y: Number(n.pos.y) }
    })
    return pos
  }

  /** 把一組矩形（世界座標）縮放置中到 w×h 的可視區，留 pad 邊距。 */
  function fit(rects, w, h, pad, maxScale) {
    if (!rects.length || w <= 0 || h <= 0) return { scale: 1, tx: w / 2, ty: h / 2 }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    rects.forEach(function (r) { minX = Math.min(minX, r.x); minY = Math.min(minY, r.y); maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h) })
    var p = pad == null ? 24 : pad
    var bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY)
    var scale = Math.min((w - 2 * p) / bw, (h - 2 * p) / bh, maxScale || 1.25)
    scale = Math.max(0.2, scale)
    return { scale: scale, tx: w / 2 - (minX + bw / 2) * scale, ty: h / 2 - (minY + bh / 2) * scale }
  }

  root.SamBusinessMap = {
    SCHEMA: SCHEMA, HY_ID: HY_ID, STALE_DAYS: STALE_DAYS, UNKNOWN: UNKNOWN, STATUSES: STATUSES, KINDS: KINDS,
    EDGE_TYPES: EDGE_TYPES, FIELDS: FIELDS, COMPANY_IDS: COMPANY_IDS, HIDDEN_ROLE: HIDDEN_ROLE,
    show: show, seed: seed, ensureMap: ensureMap, getNode: getNode, companies: companies, statusSummary: statusSummary,
    addNode: addNode, updateNode: updateNode, removeNode: removeNode, edgesOf: edgesOf,
    addEdge: addEdge, updateEdge: updateEdge, removeEdge: removeEdge, edgeLabel: edgeLabel, nodeSubtitle: nodeSubtitle,
    staleness: staleness, layout: layout, fit: fit,
  }
})(typeof window !== 'undefined' ? window : globalThis)
