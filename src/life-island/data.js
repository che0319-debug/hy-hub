// HY Life 島：世界定義（V5.1 第三部分「世界定義表」）。目前只建「中央島」。
import { ROSTER } from '../botRoster.js'
// route = 現有的 2D 頁；沒有的寫 null 並在 note 說明。沒有真資料的欄位一律「待補」，不編造。
export const CENTRAL_ISLAND = {
  id: 'central', name: '中央島', sub: '派工 · Atlas', c: [0, 0], R: 4,
  buildings: [
    {
      id: 'today', title: '今日廣場', type: 'system', form: 'plaza', height: 3.0, q: 0, r: 0,
      kind: '功能', agent: 'Atlas', status: '新做',
      blurb: '今天要看的事：今日行程、待辦清單、本週變化。',
      links: [{ label: '開啟首頁（現有）', to: '/' }],
      note: '整合進來後，首頁的資訊都從這裡看；開啟 HY Life 島時不會彈出。',
    },
    {
      id: 'dispatch', title: '派工坊', type: 'system', form: 'dispatch', height: 2.6, q: 2, r: -2,
      kind: '功能', agent: 'Atlas', status: '現有',
      blurb: '全部專案的派工、執行、審查與驗收。',
      links: [{ label: '開啟 Bot Office', to: '/bot-office' }],
      note: '舊的 AI Office 頁面已移除，派工坊使用 Bot Office。',
    },
    {
      id: 'meeting', title: '會議帳篷', type: 'business', form: 'meeting', height: 1.5, q: 0, r: 2,
      kind: '功能', agent: 'Atlas', status: '待補',
      blurb: '晨會紀錄與你的 comment。',
      links: [],
      note: '目前晨會用對話進行，還沒有網頁；之後讀第二部分的晨會卡片。',
    },
    {
      id: 'syscenter', title: '系統中心', type: 'system', form: 'syscenter', height: 3.0, q: -2, r: 0,
      kind: '管理', agent: 'Atlas', status: '現有',
      blurb: '管理系統用的頁面：AI 軍團、設定、Agent 設定。',
      links: [
        { label: 'AI 軍團', to: '/ai-army' },
        { label: '設定', to: '/settings' },
      ],
      note: '還沒連上的頁先放這裡，慢慢接。',
    },
  ],
};

export const BUSINESS_ISLAND = {
  id: 'biz', name: '科研島', sub: 'ITRI · 950157', c: [-24, -8], R: 3,
  buildings: [
    {
      id: 'hq', title: '本業總部', type: 'business', form: 'hq', height: 3.0, q: 0, r: 0,
      kind: '分身總部', agent: '950157', status: '現有',
      blurb: '950157（ITRI 工作分身）的控制中心：本業待辦、專案進度、週報。',
      links: [{ label: '開啟 950157 看板', to: '/line/950157' }],
      note: '建築造型取自工研院園區：帶狀玻璃、屋頂水塔、弧形退台翼樓與草地中庭。',
    },
    {
      id: 'lab', title: '研究院', type: 'research', form: 'lab', height: 2.4, q: 1, r: 0,
      kind: '功能', agent: '950157', status: '待補',
      blurb: 'Research Lab：研究主軸、專案、題目與情報。',
      links: [{ label: '950157 看板（含研究區）', to: '/line/950157' }],
      note: 'Research Lab 還沒有專屬網頁，先連到 950157 看板的研究區。',
    },
  ],
};

export const LIFE_ISLAND = {
  id: 'life', name: '隱地島', sub: 'HY', c: [14, -26], R: 3,
  buildings: [
    {
      id: 'brain', title: '大腦圖書館', type: 'system', form: 'brain', height: 3.0, q: 0, r: 0,
      kind: '功能', agent: 'HY', status: '待補',
      blurb: '第二大腦：筆記、文獻與想法的收納處。',
      links: [], note: '還沒有對應頁面，等第二大腦建好再連結。',
    },
    {
      id: 'dojo', title: '人生修練館', type: 'personal', form: 'dojo', height: 2.0, q: 1, r: 0,
      kind: '功能', agent: 'HY', status: '現有',
      blurb: '人生目標與習慣：修練的地方。',
      links: [{ label: '開啟人生目標', to: '/goals' }],
    },
    {
      id: 'board', title: '戰略盤', type: 'system', form: 'sandtable', height: 1.5, q: 0, r: 1,
      kind: '功能', agent: 'HY', status: '現有',
      blurb: '長期策略：棋盤上推演下一步。',
      links: [{ label: '開啟策略', to: '/strategy' }],
    },
  ],
}

export const FAMILY_ISLAND = {
  id: 'family', name: '棲園島', sub: '小因', c: [-14, 26], R: 3,
  buildings: [
    {
      id: 'home', title: '家', type: 'personal', form: 'home', height: 2.2, q: 0, r: 0,
      kind: '分身總部', agent: '小因', status: '現有',
      blurb: '小因（家庭分身）的控制中心：家裡的行程、接送與待辦。',
      links: [{ label: '開啟小因看板', to: '/line/family' }],
    },
    {
      id: 'gym', title: '健身房', type: 'personal', form: 'gym', height: 2.5, q: 1, r: 0,
      kind: '功能', agent: '小因', status: '待補',
      blurb: '運動與健康習慣的紀錄與規劃。',
      links: [], note: '還沒有對應頁面，先放著。',
    },
  ],
}

export const SIDE_ISLAND = {
  id: 'side', name: '金融島', sub: 'Sam', c: [26, 5], R: 3,
  buildings: [
    {
      id: 'sidehq', title: '副業總部', type: 'business', form: 'sidehq', height: 3.3, q: 0, r: 0,
      kind: '分身總部', agent: 'Sam', status: '現有',
      blurb: 'Sam（副業分身）的控制中心：副業待辦、補件卡、各事業進度。',
      links: [{ label: '開啟 Sam 看板', to: '/line/sam' }],
    },
    {
      id: 'phone', title: '手機店', type: 'business', form: 'phoneshop', height: 1.9, q: 1, r: 0,
      kind: '事業', agent: 'Sam', status: '待補',
      blurb: '手機店：庫存、訂單與補件。', links: [{ label: '開啟 Sam 看板', to: '/line/sam' }],
      note: '目前先放在 Sam 看板，之後可拆成專屬頁。',
    },
    {
      id: 'cuyu', title: '川嶼甜點店', type: 'business', form: 'cuyu', height: 1.9, q: 0, r: 1,
      kind: '事業', agent: 'Sam', status: '待補',
      blurb: '甜點事業（建設中）。', links: [], note: '建設中，還沒有對應頁面。',
    },
    {
      id: 'chuan', title: '川泱購物', type: 'business', form: 'chuan', height: 2.6, q: 1, r: 1, project: 'p-002',
      // 完工並從 Bot Office 刪除後，才在這格寫 memorial: { name, completedOn: 'YYYY-MM-DD', blurb, look: 'shop' }。
      // 川泱還沒完成，不要填。格子上同時有進行中專案時，即時資料蓋過紀念。
      kind: '事業', agent: 'Sam', status: '待補',
      blurb: '購物事業（建設中）。', links: [], note: '建設中，還沒有對應頁面。',
    },
  ],
}

export const ISLANDS_DATA = [CENTRAL_ISLAND, BUSINESS_ISLAND, LIFE_ISLAND, FAMILY_ISLAND, SIDE_ISLAND];
export const ALL_BUILDINGS = ISLANDS_DATA.flatMap(isl => isl.buildings.map(b => ({ ...b, islandId: isl.id, islandName: isl.name })));

// 建築在島上的街區（bi, bj）。3D 場景把建築放在島心 + (bi, bj) × BLOCK。角色的 zone 用同一個 id。
export const BUILDING_BLOCK = { today: [0, 0], dispatch: [1, -1], meeting: [2, 1], syscenter: [-1, 0], hq: [0, 0], lab: [1, 0], brain: [0, 0], dojo: [1, 0], board: [0, 1], home: [0, 0], gym: [1, 0], sidehq: [-1, -1], phone: [1, -1], cuyu: [-1, 1], chuan: [1, 1] };
export const BLOCK = 4;

export function buildingWorld(islandId, buildingId) {
  const isl = ISLANDS_DATA.find(i => i.id === islandId);
  const key = BUILDING_BLOCK[buildingId];
  if (!isl || !key) return null;
  return { x: isl.c[0] + key[0] * BLOCK, z: isl.c[1] + key[1] * BLOCK };
}

// 角色閒晃的基地：他所屬建築的世界座標。場景再把他放到該建築朝鏡頭一側的馬路上。
export function figureHome(fig) {
  if (!fig) return null;
  return buildingWorld(fig.island, fig.zone);
}

// 起步點：建築朝鏡頭的一側，再用名冊順序錯開。az 要跟場景鏡頭方位一樣。之後場景會吸到最近的馬路格。
export function figureFront(home, index, az = 0.62) {
  if (!home) return null;
  const ca = Math.cos(az), sa = Math.sin(az);
  const reach = 1.9 + (index % 2) * 0.7;
  const side = (index - 2) * 0.5;
  return { x: home.x + reach * sa + side * ca, z: home.z + reach * ca - side * sa };
}

// 名稱、角色、位置來自 src/botRoster.js（全站唯一名冊）。
// 即時狀態由 useBotRoster 疊到小幫手與執行者；staticInfo 的角色（Wade）不疊，卡片只顯示介紹。
// status：wait / ai / you / done / bad。zone：平常活動的建築區。status 是 you 或 bad 的會停在原地等你。
export const FIGURES = ROSTER.map(r => ({
  id: r.id, island: r.island, name: r.name, kind: r.kind, status: 'wait', zone: r.zone, role: r.post, board: r.board,
  ownerId: r.ownerId || null, intro: r.intro || '', staticInfo: r.staticInfo === true,
}))

// 靜態角色不讀第二、第三個參數（Bot Office、待辦、記憶、roster 狀態）。
// 其他角色維持原本的卡片，由畫面在 staticInfo 為 false 時自己接 live。
export function islandBotCard(fig) {
  if (fig?.staticInfo) return { staticInfo: true, name: fig.name, role: fig.role, intro: fig.intro || '' };
  return { staticInfo: false };
}

// 狀態色的意義（全站一致，見 hy-ui 風格 A）
export const STATUS_INFO = {
  wait: '等待／追蹤中',
  ai: 'AI 執行中',
  you: '待你確認',
  done: '完成',
  bad: '逾期／失敗／危險',
};
