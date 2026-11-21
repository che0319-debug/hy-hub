/* 事業版圖 v2（滿版關聯圖）資料邏輯
 * 正本：sam_data.json → business_ops.map_v2（經 GET/POST /api/sam-progress 的 business_ops key 讀寫）。
 * 舊的 business_ops.graph／business_ops.board 原封不動保留在正本裡，本頁不讀、不畫、不刪。
 * 白名單：HY 中心＋五家公司（樂川、RM 餐酒館、上淼、迪繆斯 DIVIOS、新竹3C）＋使用者之後新增的人物／資源。
 * 2026-11-13 定稿：五家同層、收入改純文字 income_note。已退場的舊節點若出現在 map_v2 會被濾掉。
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
  var COMPANY_IDS = ['lechuan', 'rm', 'shangmiao', 'divios', 'hsinchu3c']
  var HIDDEN_ROLE = '隱名股東（登記上不會出現 HY 名字）'
  var HSINCHU_INCOME = '每月穩定2萬'
  var INCOME_NOTE_DEFAULTS = { lechuan: UNKNOWN, rm: UNKNOWN, shangmiao: UNKNOWN, divios: UNKNOWN, hsinchu3c: HSINCHU_INCOME }
  /* 2026-11-11 已刪、不得復活的舊節點。只看 id／顯示名稱／法律主體，不掃內文，避免誤傷樂川、上淼的說明。
   * 已退場地名不直接寫在原始碼，避免頁面檔被搜到那兩個字。 */
  var RETIRED_COAST = '\u5317\u6d77\u5cb8'
  var RETIRED_IDS = {
    dessert: 1, bake33: 1, bake_33: 1, vending: 1, vending_ig: 1, vending_partner: 1,
    art_trade: 1, artwork: 1, anzheng: 1, an_zheng: 1, north_coast: 1, northcoast: 1,
    beihai: 1, beihai_seafood: 1, cuyu: 1, chuyu: 1, chuanyu: 1, chuanyang: 1, chuan: 1,
    tailor: 1, sewing: 1, tavern: 1, old_tavern: 1, big_tavern: 1,
  }

  /* 欄位定義：key、標籤、是否多行。順序即面板與表單順序。 */
  var FIELDS = {
    company: [
      { sec: '基本' },
      { key: 'name', label: '顯示名稱', required: true },
      { key: 'legal_name', label: '法律主體名稱' },
      { key: 'legal_state', label: '法律主體', options: ['已確認', '待確認', '未知'] },
      { key: 'status', label: '近三月狀態', options: STATUSES },
      { key: 'status_source', label: '狀態來源' },
      { key: 'business', label: '業務', multi: true },
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
      { sec: '收入' },
      { key: 'income_note', label: '收入', multi: true, hint: '純文字備註，可多行、可手改。不知道就寫未知。不從帳本帶入數字。' },
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
  var DIVIOS_DATE = '2026-11-11T09:40:00.000Z' // 使用者 17:34 確認帝爾 90895872 後更新（台北 17:40）
  var HSINCHU_DATE = '2026-11-13T09:54:00.000Z' // 使用者 2026-11-13 17:54（台北）核定第五家與收入欄

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
        income_note: UNKNOWN,
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
        income_note: UNKNOWN,
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
        income_note: UNKNOWN,
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
        id: 'divios', kind: 'company', name: '迪繆斯 DIVIOS', legal_name: '帝爾股份有限公司', legal_state: '已確認',
        status: '未知', status_source: '沒有入帳憑證或近三月數字',
        tax_id: '90895872',
        registry: [
          '公司名稱：帝爾股份有限公司（品牌名迪繆斯 DIVIOS；使用者 2026-11-11 17:34 確認）',
          '登記現況：核准設立（官方 API 案件狀態欄「復業」，只照錄）',
          '核准設立日：110-05-17（2021-05-17）；二手歷程寫當時為「帝爾有限公司」，2024-08 改股份有限公司',
          '資本總額／實收資本額：各新臺幣 8,300,000 元（登記資本，不是帳戶現金）',
          '代表人：劉姿廷（董事長）；董事鄭有倫、林秋翠；監察人王忻瀅（官方董監事 API）。登記代表人與董監不代表 HY 的權益',
          '現登記地址：臺中市西區四維街5號（2024-03 起曾登記南港園區街58巷5號1樓，二手歷程）',
          '登記機關：臺中市政府',
          '最後核准變更日：115-07-01（2026-07-01）',
          '分公司（二手）：帝爾股份有限公司台中分公司 00181239，臺中市西區利民里四維街5號1樓',
          '品牌寫 2019 成立，公司 2021 才核准設立；中間是否另有主體，未知',
        ].join('\n'),
        business: '形象顧問：色彩鑑定、風格分析、形象策略；開設 DCA（高階色彩分析師）、DFA（時裝風格分析師）課程。門市：南港旗艦店、台中店；2025-10-10 開美麗華本館一樓專櫃。',
        stake_role: HIDDEN_ROLE, stake_ratio: UNKNOWN, stake_via: UNKNOWN, stake_written: UNKNOWN, stake_invested: UNKNOWN,
        stake_note: '登記代表人與董監不代表 HY 的權益；董監持股表加總不等於資本總額，不可反推比例。',
        income_note: UNKNOWN,
        income_actual: UNKNOWN + '（沒有本公司憑證）',
        income_leads: '品牌有門市、專櫃、課程與選品；媒體轉述「13 萬會員」，不轉成營收。',
        income_unknown: '各門市／專櫃營收、課程收入、公司損益與現金。',
        costs: UNKNOWN + '（租金、專櫃抽成、人事等皆無帳單）', gaps: '持股比例未知；近三月收入、損益、現金都沒有數字。',
        questions: [
          '隱名股權透過誰持有、比例多少、有無書面約定？',
          '近三個月大概是賺、打平，還是虧？',
          '2019 品牌到 2021 公司設立之間，是否還有別的主體？',
        ].join('\n'),
        sources: [
          '使用者 2026-11-11 17:34 口述：「Divios 是 帝爾｜90895872」',
          '經濟部開放資料 API（90895872 基本資料＋董監事），2026-11-11；twfile 歷程（二手）',
          '官網 diviosartgallery.easy.co；《警政時報》2025-10-13；誠品合作品牌頁（2026-11-11 讀回）',
          '使用者 2026-11-11 16:51 口述：隱名入股',
        ].join('\n'),
        maintainer: 'Sam', followup_due: '', updated_at: DIVIOS_DATE,
      },
      {
        id: 'hsinchu3c', kind: 'company', name: '新竹3C手機店', legal_name: UNKNOWN, legal_state: '未知',
        status: '未知', status_source: UNKNOWN,
        tax_id: UNKNOWN,
        registry: UNKNOWN,
        business: UNKNOWN,
        stake_role: UNKNOWN, stake_ratio: UNKNOWN, stake_via: UNKNOWN, stake_written: UNKNOWN, stake_invested: UNKNOWN,
        stake_note: UNKNOWN,
        income_note: HSINCHU_INCOME,
        costs: UNKNOWN, gaps: UNKNOWN,
        questions: UNKNOWN,
        sources: '使用者 2026-11-13 核定：穩定合作的投資',
        maintainer: 'Sam', followup_due: '', updated_at: HSINCHU_DATE,
      },
    ]
  }

  function seedEdges() {
    var notes = { lechuan: '比例未知', rm: '比例未知；店與法律主體仍待確認', shangmiao: '約 45%（內部約數）', divios: '比例未知' }
    var edges = ['lechuan', 'rm', 'shangmiao', 'divios'].map(function (id) {
      return { id: 'e_hy_' + id, from: HY_ID, to: id, type: '隱名股東', note: notes[id], via: UNKNOWN, written: UNKNOWN, confirmed: true, source: '使用者 2026-11-11 16:51「我都是隱名入股」', updated_at: SEED_DATE }
    })
    edges.push({
      id: 'e_hy_hsinchu3c', from: HY_ID, to: 'hsinchu3c', type: '投資', note: '穩定合作的投資',
      via: UNKNOWN, written: UNKNOWN, confirmed: true, source: '使用者 2026-11-13 核定：穩定合作的投資', updated_at: HSINCHU_DATE,
    })
    return edges
  }

  function seed() {
    var nodes = [{ id: HY_ID, kind: 'hy', name: 'HY', maintainer: 'HY', updated_at: SEED_DATE }].concat(seedCompanies())
    return { schema_version: SCHEMA, seeded_from: 'company-profiles-v0（2026-11-11）＋2026-11-13 五家與收入欄', nodes: nodes, edges: seedEdges(), updated_at: HSINCHU_DATE }
  }

  /** 舊節點不得留在 map_v2。RM 餐酒館是第一圈公司，不因名稱含「餐酒館」被刪。 */
  function isRetiredNode(n) {
    if (!n || n.kind === 'hy' || n.id === HY_ID) return false
    var id = str(n.id).toLowerCase()
    if (RETIRED_IDS[id]) return true
    var name = str(n.name)
    var blob = name + '\n' + str(n.legal_name) + '\n' + id
    if (blob.indexOf(RETIRED_COAST) >= 0) return true
    if (/甜品工廠/.test(blob)) return true
    if (/烘\s*33|烘三十三/.test(blob)) return true
    if (/販賣機/.test(blob)) return true
    if (/藝術品/.test(blob)) return true
    if (/安正/.test(name) || id.indexOf('anzheng') >= 0 || id.indexOf('an_zheng') >= 0) return true
    if (/川嶼|川泱/.test(blob)) return true
    if (/成衣[／/]裁縫|裁縫資源/.test(blob)) return true
    if (/大型餐酒館|招待所|竹北餐飲|招待資源/.test(blob)) return true
    if (name === '餐酒館') return true
    return false
  }

  function hsinchuEdge() {
    return seedEdges().filter(function (e) { return e.to === 'hsinchu3c' })[0]
  }

  /**
   * 取得（必要時建立或遷移）map_v2。舊 graph／board／businesses 不讀也不改。
   * 缺新竹3C、五家收入欄是空的、或混入已刪節點時，seeded 為 true，讓畫面走「按右上儲存」；本次不自己寫正式 API。
   * 已有的 income_note 不覆蓋。不改 status，不把舊三分欄或帳本持股抄進新欄。
   */
  function ensureMap(businessOps) {
    var seeded = false
    if (!businessOps.map_v2 || typeof businessOps.map_v2 !== 'object' || !Array.isArray(businessOps.map_v2.nodes)) {
      businessOps.map_v2 = seed(); seeded = true
    }
    var m = businessOps.map_v2
    m.edges = Array.isArray(m.edges) ? m.edges : []
    var retired = false
    m.nodes = m.nodes.filter(function (n) {
      if (!(n && n.id && KINDS[n.kind])) return false
      if (isRetiredNode(n)) { retired = true; return false }
      return true
    })
    if (retired) seeded = true
    if (!m.nodes.some(function (n) { return n.id === HY_ID })) {
      m.nodes.unshift({ id: HY_ID, kind: 'hy', name: 'HY', maintainer: 'HY', updated_at: nowIso() })
      seeded = true
    }
    if (!m.nodes.some(function (n) { return n.id === 'hsinchu3c' })) {
      m.nodes.push(seedCompanies().filter(function (c) { return c.id === 'hsinchu3c' })[0])
      seeded = true
    }
    m.nodes.forEach(function (n) {
      if (!INCOME_NOTE_DEFAULTS[n.id] || n.kind !== 'company') return
      if (!str(n.income_note)) { n.income_note = INCOME_NOTE_DEFAULTS[n.id]; seeded = true }
    })
    var hasHsEdge = m.edges.some(function (e) {
      return e && ((e.from === HY_ID && e.to === 'hsinchu3c') || (e.from === 'hsinchu3c' && e.to === HY_ID))
    })
    if (!hasHsEdge) { m.edges.push(hsinchuEdge()); seeded = true }
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

  /** 線上標籤（詳情關係列沿用）：類型＋說明，例如「隱名股東（約 45%）」。比例未知寫「未知」，不填假數字。 */
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

  /** 圖上連線標籤只寫關係類型，不寫比例。未確認改由虛線表示，標籤仍只寫類型。 */
  function edgeTypeLabel(e) {
    return str(e && e.type) || '其他'
  }

  /** 空白、或「未知／待確認」開頭，畫面當成尚未掌握。 */
  function isBlankish(v) {
    var s = str(v)
    return !s || s === UNKNOWN || s.indexOf('未知') === 0 || s.indexOf('待確認') === 0
  }

  function companyRoleShort(n, edgeType) {
    var role = str(n.stake_role)
    if (role.indexOf('隱名') >= 0) return '隱名股東'
    if (isBlankish(role)) return str(edgeType)
    return role.replace(/（.*$/, '').trim() || str(edgeType)
  }

  function companyRatio(n) {
    var ratio = str(n.stake_ratio).replace(/（.*$/, '').trim()
    return !ratio || isBlankish(ratio) ? '比例未知' : ratio
  }

  /**
   * 卡片頁尾／副標。公司是「角色・比例」；角色未知時用連線類型（例：投資・比例未知）。
   * edgeType 可省略，省略時未知角色不硬填「角色未知」。
   */
  function nodeSubtitle(n, edgeType) {
    if (!n) return ''
    if (n.kind === 'company') {
      var role = companyRoleShort(n, edgeType)
      var ratio = companyRatio(n)
      return role ? role + '・' + ratio : ratio
    }
    if (n.kind === 'person') return str(n.role) || str(n.relation) || ''
    if (n.kind === 'resource') return [str(n.rtype), str(n.location)].filter(Boolean).join('・')
    return ''
  }

  /** 公司卡面。收入、業務照原文；status 只有賺／平／虧才出現。 */
  function cardFace(n, edgeType) {
    var type = str(edgeType)
    var income = str(n.income_note) || UNKNOWN
    var business = str(n.business)
    return {
      kicker: type || companyRoleShort(n, ''),
      name: str(n.name) || '未命名',
      status: n.status === '賺' || n.status === '平' || n.status === '虧' ? n.status : '',
      income: income,
      incomeUnknown: isBlankish(n.income_note),
      business: isBlankish(business) ? UNKNOWN : business.split('\n')[0],
      businessUnknown: isBlankish(business),
      footer: nodeSubtitle(n, type),
      maintainer: str(n.maintainer),
    }
  }

  var UNKNOWN_FACE = [
    ['status', '近三月狀態'], ['legal_name', '法律主體'], ['tax_id', '統編'], ['business', '業務'],
    ['stake_ratio', '比例'], ['stake_via', '透過誰持有'], ['stake_written', '書面約定'],
    ['stake_invested', '投入'], ['income_note', '收入'], ['costs', '支出'],
  ]

  /** 詳細面板「尚未掌握」：未知欄位併成一行。不包含待問、缺口、補件日。 */
  function unknownLabels(n) {
    if (!n || n.kind !== 'company') return []
    return UNKNOWN_FACE.filter(function (pair) { return isBlankish(n[pair[0]]) }).map(function (pair) { return pair[1] })
  }

  /* 識別色綁公司 id。主色只用在細線、關係小標、連線末端、圖例、選取光暈。 */
  var COMPANY_ACCENTS = {
    lechuan: { main: '#a5782f', text: '#8a6326', soft: '#f3eadb' },
    rm: { main: '#a65a3c', text: '#a65a3c', soft: '#f4e4dc' },
    shangmiao: { main: '#3f5e4a', text: '#3f5e4a', soft: '#e3ebe4' },
    divios: { main: '#6e5f7a', text: '#6e5f7a', soft: '#ebe6ee' },
    hsinchu3c: { main: '#4f6b82', text: '#4f6b82', soft: '#e2e8ee' },
  }
  var ACCENT_FALLBACK = [
    { main: '#7d6b4f', text: '#7d6b4f', soft: '#efe8dc' },
    { main: '#5e6f63', text: '#5e6f63', soft: '#e4ebe6' },
  ]
  var PERSON_ACCENT = { main: '#7a5c45', text: '#7a5c45', soft: '#f3ebe4' }
  var RESOURCE_ACCENT = { main: '#5f7a73', text: '#5f7a73', soft: '#e7eeeb' }

  function accentFor(node, map) {
    if (!node) return ACCENT_FALLBACK[0]
    if (node.kind === 'person') return PERSON_ACCENT
    if (node.kind === 'resource') return RESOURCE_ACCENT
    if (COMPANY_ACCENTS[node.id]) return COMPANY_ACCENTS[node.id]
    var extras = ((map && map.nodes) || []).filter(function (n) { return n.kind === 'company' && !COMPANY_ACCENTS[n.id] })
    var idx = 0
    for (var i = 0; i < extras.length; i++) if (extras[i].id === node.id) { idx = i; break }
    return ACCENT_FALLBACK[idx % ACCENT_FALLBACK.length]
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

  /* 連線標籤幾何。尺寸對齊畫面：公司卡 280×237、HY 圓直徑 128、外圍光暈 22px（box-shadow spread）、
   * 標籤 11px、字距 0.18em、左右內距 8、上下 2（「隱名股東」實測 68×19、「投資」42×19）。 */
  var HY_RADIUS = 64
  var HY_GLOW = 22
  var LABEL_GAP = 8
  var CARD_GAP = 4
  var NODE_BOX = {
    hy: { w: 128, h: 128 },
    company: { w: 280, h: 237 },
    person: { w: 232, h: 128 },
    resource: { w: 232, h: 120 },
  }

  function labelSize(text) {
    var s = str(text)
    var fs = 11
    var width = 0
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i)
      width += (code >= 32 && code < 127) ? fs * 0.56 : fs
      width += fs * 0.18
    }
    return { w: Math.ceil(width + 16), h: 19 }
  }

  function nodeBox(node, p) {
    var s = NODE_BOX[(node && node.kind) || 'company'] || NODE_BOX.company
    var x = p && isFinite(p.x) ? p.x : 0
    var y = p && isFinite(p.y) ? p.y : 0
    return { x: x - s.w / 2, y: y - s.h / 2, w: s.w, h: s.h }
  }

  function rectHitsCircle(rect, cx, cy, r) {
    var x = Math.max(rect.x, Math.min(cx, rect.x + rect.w))
    var y = Math.max(rect.y, Math.min(cy, rect.y + rect.h))
    var dx = x - cx
    var dy = y - cy
    return dx * dx + dy * dy < r * r
  }

  function rectsOverlap(a, b, gap) {
    var g = gap || 0
    return a.x < b.x + b.w + g && a.x + a.w + g > b.x && a.y < b.y + b.h + g && a.y + a.h + g > b.y
  }

  function labelBlocked(rect, hyPos, cards, placed, cardGap, labelGap) {
    if (hyPos && rectHitsCircle(rect, hyPos.x, hyPos.y, HY_RADIUS + HY_GLOW + LABEL_GAP)) return true
    for (var i = 0; i < cards.length; i++) if (rectsOverlap(rect, cards[i], cardGap)) return true
    for (var j = 0; j < placed.length; j++) {
      var p = placed[j]
      if (rectsOverlap(rect, { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h }, labelGap)) return true
    }
    return false
  }

  /**
   * 連線標籤中心。優先沿連線，放在 HY 光暈外、卡片之間的空檔；
   * 空檔不夠時再往連線兩側推，避免壓到 HY 圓（含 22px 光暈）或被卡片蓋住。
   * 回傳 {id, text, x, y, w, h}，x/y 是標籤中心（對齊畫面的 translate -50%,-50%）。
   */
  function edgeLabelLayout(map, pos) {
    var hyPos = pos[HY_ID] || null
    var cards = []
    map.nodes.forEach(function (n) {
      if (!n || n.kind === 'hy' || !pos[n.id]) return
      cards.push(nodeBox(n, pos[n.id]))
    })
    var placed = []
    var out = []
    map.edges.forEach(function (e) {
      var a = pos[e.from]
      var b = pos[e.to]
      var text = edgeTypeLabel(e)
      var size = labelSize(text)
      if (!a || !b) {
        var missing = { id: e.id, text: text, x: 0, y: 0, w: size.w, h: size.h }
        placed.push(missing)
        out.push(missing)
        return
      }
      var from = a
      var to = b
      var anchored = e.from === HY_ID || e.to === HY_ID
      if (e.to === HY_ID) { from = b; to = a }
      var dx = to.x - from.x
      var dy = to.y - from.y
      var len = Math.hypot(dx, dy) || 1
      var ux = dx / len
      var uy = dy / len
      var px = -uy
      var py = ux
      function at(dist, off) {
        var cx = from.x + ux * dist + px * off
        var cy = from.y + uy * dist + py * off
        return { id: e.id, text: text, x: cx, y: cy, w: size.w, h: size.h, rect: { x: cx - size.w / 2, y: cy - size.h / 2, w: size.w, h: size.h } }
      }
      var best = null
      var bestScore = Infinity
      function consider(dist, off, cardGap, labelGap) {
        if (dist < 0 || dist > len) return
        var box = at(dist, off)
        if (labelBlocked(box.rect, hyPos, cards, placed, cardGap, labelGap)) return
        var score = Math.abs(off) * 10000 + (anchored ? dist : Math.abs(dist - len / 2))
        if (score < bestScore) { bestScore = score; best = box }
      }
      var d
      for (d = 4; d <= len - 4; d += 2) consider(d, 0, CARD_GAP, 2)
      if (!best) {
        var off
        for (off = 4; off <= 120; off += 4) {
          for (d = 4; d <= len - 4; d += 4) {
            consider(d, off, CARD_GAP, 2)
            consider(d, -off, CARD_GAP, 2)
          }
          if (best) break
        }
      }
      if (!best) {
        for (d = 4; d <= len - 4; d += 4) consider(d, 0, 0, 0)
      }
      if (!best) best = at(anchored ? Math.min(len - 4, HY_RADIUS + HY_GLOW + LABEL_GAP + size.w / 2) : len / 2, 0)
      delete best.rect
      placed.push(best)
      out.push(best)
    })
    return out
  }

  /**
   * 預設佈局（世界座標，HY 在 0,0）：公司均分第一圈，人物與資源均分外圈。
   * aspect = 畫布寬/高。橢圓拉得比畫布緩和，讓 280px 公司卡之間留得下空隙。
   * 手動拖過的卡（n.pos）保留原位。
   */
  function layout(map, aspect) {
    var a = Math.max(0.4, Math.min(3, aspect || 1.6))
    var ax = Math.max(0.92, Math.min(1.35, Math.pow(a, 0.35)))
    var ay = Math.max(0.92, Math.min(1.35, Math.pow(a, -0.35)))
    var R1 = 320, R2 = 640
    var pos = {}
    var comps = map.nodes.filter(function (n) { return n.kind === 'company' })
    var outer = map.nodes.filter(function (n) { return n.kind === 'person' || n.kind === 'resource' })
    // 直式畫面（手機關聯圖）把第一圈轉 45°，讓左右兩張公司卡與 HY 之間留得下關係標籤
    var base = a < 1 ? 45 : 0
    // 角度是畫面上的方位角，五家才會繞著中心均分；再用橢圓半徑吃滿寬或高。
    function ring(list, R, offset, minX) {
      var rx = Math.max(R * ax, minX)
      var ry = Math.max(R * ay, minX * 0.72)
      list.forEach(function (n, i) {
        var ang = (-90 + offset + (360 / Math.max(1, list.length)) * i) * Math.PI / 180
        var c = Math.cos(ang), s = Math.sin(ang)
        var t = 1 / Math.sqrt((c * c) / (rx * rx) + (s * s) / (ry * ry))
        pos[n.id] = { x: Math.round(c * t), y: Math.round(s * t) }
      })
    }
    ring(comps, R1, base, 300)
    ring(outer, R2, base + (comps.length ? 180 / Math.max(comps.length, outer.length) : 0), 560)
    map.nodes.forEach(function (n) {
      if (n.kind === 'hy') pos[n.id] = { x: 0, y: 0 }
      if (n.pos && isFinite(n.pos.x) && isFinite(n.pos.y)) pos[n.id] = { x: Number(n.pos.x), y: Number(n.pos.y) }
    })
    return pos
  }

  /** 把一組矩形（世界座標）縮放置中到 w×h 的可視區，留 pad 邊距。上限預設 1.8。 */
  function fit(rects, w, h, pad, maxScale) {
    if (!rects.length || w <= 0 || h <= 0) return { scale: 1, tx: w / 2, ty: h / 2 }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    rects.forEach(function (r) { minX = Math.min(minX, r.x); minY = Math.min(minY, r.y); maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h) })
    var p = pad == null ? 32 : pad
    var bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY)
    var scale = Math.min((w - 2 * p) / bw, (h - 2 * p) / bh, maxScale == null ? 1.8 : maxScale)
    scale = Math.max(0.2, scale)
    return { scale: scale, tx: w / 2 - (minX + bw / 2) * scale, ty: h / 2 - (minY + bh / 2) * scale }
  }

  root.SamBusinessMap = {
    SCHEMA: SCHEMA, HY_ID: HY_ID, STALE_DAYS: STALE_DAYS, UNKNOWN: UNKNOWN, STATUSES: STATUSES, KINDS: KINDS,
    EDGE_TYPES: EDGE_TYPES, FIELDS: FIELDS, COMPANY_IDS: COMPANY_IDS, HIDDEN_ROLE: HIDDEN_ROLE,
    show: show, seed: seed, ensureMap: ensureMap, getNode: getNode, companies: companies, statusSummary: statusSummary,
    addNode: addNode, updateNode: updateNode, removeNode: removeNode, edgesOf: edgesOf,
    addEdge: addEdge, updateEdge: updateEdge, removeEdge: removeEdge,
    edgeLabel: edgeLabel, edgeTypeLabel: edgeTypeLabel, nodeSubtitle: nodeSubtitle, cardFace: cardFace,
    labelSize: labelSize, nodeBox: nodeBox, edgeLabelLayout: edgeLabelLayout,
    HY_RADIUS: HY_RADIUS, HY_GLOW: HY_GLOW, LABEL_GAP: LABEL_GAP,
    isBlankish: isBlankish, unknownLabels: unknownLabels, accentFor: accentFor,
    COMPANY_ACCENTS: COMPANY_ACCENTS, ACCENT_FALLBACK: ACCENT_FALLBACK,
    PERSON_ACCENT: PERSON_ACCENT, RESOURCE_ACCENT: RESOURCE_ACCENT,
    staleness: staleness, layout: layout, fit: fit,
  }
})(typeof window !== 'undefined' ? window : globalThis)
