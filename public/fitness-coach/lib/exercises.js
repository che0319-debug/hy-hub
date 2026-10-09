// 動作庫（V1）：健身房常見動作。內容為 HY AI Work 自行撰寫的文字說明，無外部圖片／影片素材。
// 安全提示為一般性提醒，不取代醫療或復健建議。

export const CONTENT_SOURCE = {
  label: '自製文字說明',
  detail: '動作步驟、常見錯誤與安全提示由 HY AI Work 依一般肌力訓練常識撰寫；V1 不使用外部圖片或影片，因此沒有第三方授權問題。',
  license: '自製內容，HY 自用',
}

export const GENERAL_SAFETY = '訓練中出現疼痛（非一般痠累）、頭暈、胸悶或呼吸困難，請立即停止；持續不適請就醫。本 App 不提供醫療或復健建議。'

export const EQUIPMENT = { barbell: '槓鈴', dumbbell: '啞鈴', machine: '機械', cable: '纜繩', bodyweight: '自體重', kettlebell: '壺鈴', cardio: '有氧器材' }
export const MUSCLES = { chest: '胸', back: '背', shoulders: '肩', biceps: '二頭', triceps: '三頭', quads: '股四頭', hamstrings: '腿後', glutes: '臀', calves: '小腿', core: '核心', full: '全身' }

const E = (id, name, pattern, muscles, equipment, kind, steps, mistakes, safety) => ({ id, name, pattern, muscles, equipment, kind, steps, mistakes, safety })

// pattern：squat / hinge / lunge / hpush / vpush / hpull / vpull / arms / core / cond
// kind：compound 主項 / accessory 輔助 / conditioning 體能
export const EXERCISES = [
  E('back-squat', '槓鈴背蹲舉', 'squat', ['quads', 'glutes'], 'barbell', 'compound',
    ['槓放在上斜方肌，雙手握緊，腳與肩同寬、腳尖略外開', '吸氣撐住腹部，臀部往後往下坐', '蹲到大腿約與地面平行或你能維持背部中立的深度', '腳掌全踩地往上推，吐氣站直'],
    ['膝蓋內夾', '腳跟離地', '下背拱起或過度後仰'], '在深蹲架內做並設定安全槓；新手先用空槓練動作。'),
  E('goblet-squat', '高腳杯深蹲', 'squat', ['quads', 'glutes', 'core'], 'dumbbell', 'compound',
    ['雙手捧啞鈴靠近胸口', '挺胸，臀部往下坐到大腿平行附近', '手肘在兩膝內側，站起時膝蓋對準腳尖'],
    ['啞鈴離身體太遠', '只用腳尖發力'], '適合學深蹲；腰痠時先減重量。'),
  E('leg-press', '腿推機', 'squat', ['quads', 'glutes'], 'machine', 'compound',
    ['背與臀貼緊椅墊，腳放踏板中間與肩同寬', '解開安全卡，慢慢彎膝到約 90 度', '推回時膝蓋不要完全鎖死'],
    ['臀部離開椅墊', '膝蓋鎖死'], '結束前一定要把安全卡扣回。'),
  E('romanian-deadlift', '羅馬尼亞硬舉', 'hinge', ['hamstrings', 'glutes', 'back'], 'barbell', 'compound',
    ['站直握槓，膝蓋微彎固定', '臀部往後推，槓貼著大腿往下滑', '感到腿後拉伸、背還能維持平直時停住', '臀部往前推回站直'],
    ['彎腰而不是推臀', '槓離開腿太遠'], '背部無法維持中立就縮短幅度或減重。'),
  E('deadlift', '傳統硬舉', 'hinge', ['hamstrings', 'glutes', 'back'], 'barbell', 'compound',
    ['腳在槓下、槓在腳掌中間上方', '屈髖握槓，小腿碰槓，背打直', '吸氣撐腹，腳推地把槓沿腿拉起', '站直後沿原路徑放下'],
    ['起槓時圓背', '槓離身體', '站直時過度後仰'], '每組前重新設定姿勢；不要連續彈地。'),
  E('hip-thrust', '臀推', 'hinge', ['glutes', 'hamstrings'], 'barbell', 'accessory',
    ['上背靠在長椅，槓放在髖部（加護墊）', '腳踩地，膝約 90 度', '臀部用力往上推到身體成一直線，停一秒再放下'],
    ['用下背拱起代替臀部發力', '下巴抬高'], '槓要墊護墊以免壓痛骨盆。'),
  E('walking-lunge', '行走弓箭步', 'lunge', ['quads', 'glutes'], 'dumbbell', 'accessory',
    ['雙手持啞鈴站直', '向前跨一大步，後膝往下接近地面', '前腳推地，後腳往前跨下一步'],
    ['前膝內夾', '步伐太小導致腳跟離地'], '平衡不好先做原地弓箭步。'),
  E('leg-curl', '腿後勾', 'hinge', ['hamstrings'], 'machine', 'accessory',
    ['調整機器使膝蓋對準轉軸', '腳跟勾住滾墊，往臀部方向彎曲', '慢慢放回'],
    ['臀部翹起', '放下太快'], '動作全程控制速度。'),
  E('calf-raise', '提踵', 'squat', ['calves'], 'machine', 'accessory',
    ['前腳掌踩在踏板邊緣', '腳跟往下放到伸展', '用力踮起，頂端停一秒'],
    ['彈震借力', '幅度太小'], '跟腱不適時減少幅度。'),
  E('bench-press', '槓鈴臥推', 'hpush', ['chest', 'triceps', 'shoulders'], 'barbell', 'compound',
    ['躺平，眼睛在槓正下方，肩胛往後下收', '握距略寬於肩，腳踩穩地面', '槓慢慢放到胸口下緣', '往上推回肩膀正上方'],
    ['手肘外開 90 度', '臀部離開椅子', '槓在胸口彈起'], '大重量請找人保護或使用安全槓。'),
  E('db-bench-press', '啞鈴臥推', 'hpush', ['chest', 'triceps', 'shoulders'], 'dumbbell', 'compound',
    ['坐在椅端把啞鈴放大腿上，躺下時帶到胸側', '肩胛收緊，手肘約 45 度', '往上推到雙臂伸直，慢慢放回'],
    ['啞鈴互撞', '放太低肩膀前移'], '結束時先把啞鈴放回胸口再坐起。'),
  E('incline-db-press', '上斜啞鈴臥推', 'hpush', ['chest', 'shoulders', 'triceps'], 'dumbbell', 'accessory',
    ['椅背調 30 度左右', '同啞鈴臥推方式往上推', '下放到上胸兩側'],
    ['角度太高變成肩推', '腰拱離椅背'], '肩前側不適時降低角度或重量。'),
  E('push-up', '伏地挺身', 'hpush', ['chest', 'triceps', 'core'], 'bodyweight', 'accessory',
    ['雙手略寬於肩撐地，身體從頭到腳一直線', '彎手肘讓胸口接近地面', '推回原位'],
    ['腰下塌', '只做半程'], '做不到標準次數可改成手撐高處。'),
  E('overhead-press', '站姿肩推', 'vpush', ['shoulders', 'triceps', 'core'], 'barbell', 'compound',
    ['槓在鎖骨前，握距略寬於肩', '臀部與腹部夾緊', '把槓往頭頂推，頭稍微後讓槓通過', '鎖在頭頂正上方再放回'],
    ['腰往後彎', '用腿彈借力'], '肩關節活動度不足時改用坐姿啞鈴肩推。'),
  E('db-shoulder-press', '坐姿啞鈴肩推', 'vpush', ['shoulders', 'triceps'], 'dumbbell', 'accessory',
    ['椅背直立，啞鈴在耳朵兩側', '往上推到手臂伸直', '慢慢放回耳朵高度'],
    ['背離開椅背', '下放過低'], '保持手腕在手肘正上方。'),
  E('lateral-raise', '側平舉', 'vpush', ['shoulders'], 'dumbbell', 'accessory',
    ['站直，手肘微彎持啞鈴', '從側面往上抬到與肩同高', '慢慢放下'],
    ['聳肩', '甩身體借力'], '選輕重量，重點在控制。'),
  E('barbell-row', '槓鈴划船', 'hpull', ['back', 'biceps'], 'barbell', 'compound',
    ['屈髖上身前傾約 45 度，背打直', '把槓拉向肚臍', '肩胛往後夾，慢慢放下'],
    ['上身起伏借力', '圓背'], '下背疲勞時改做胸靠式划船。'),
  E('one-arm-db-row', '單手啞鈴划船', 'hpull', ['back', 'biceps'], 'dumbbell', 'accessory',
    ['一手一膝撐在長椅，背平', '另一手把啞鈴拉向髖部', '頂端停一秒，慢慢放下'],
    ['身體旋轉', '只用手臂拉'], '撐地的手肘不要鎖死。'),
  E('seated-cable-row', '坐姿纜繩划船', 'hpull', ['back', 'biceps'], 'cable', 'accessory',
    ['坐穩，腳踩踏板，膝微彎', '挺胸把握把拉向腹部', '肩胛往後夾，再慢慢伸直手臂'],
    ['身體大幅前後擺', '聳肩'], '全程保持背部中立。'),
  E('lat-pulldown', '滑輪下拉', 'vpull', ['back', 'biceps'], 'cable', 'compound',
    ['調整大腿墊壓穩，握距略寬於肩', '挺胸把槓拉到上胸', '慢慢放回手臂伸直'],
    ['身體後仰太多', '拉到頸後'], '不要做頸後下拉。'),
  E('pull-up', '引體向上', 'vpull', ['back', 'biceps', 'core'], 'bodyweight', 'compound',
    ['正手握槓，略寬於肩，身體懸垂', '肩胛先下壓，再把胸口拉向槓', '慢慢放回手臂伸直'],
    ['擺盪借力', '只做半程'], '做不到可用彈力帶或輔助機。'),
  E('db-curl', '啞鈴彎舉', 'arms', ['biceps'], 'dumbbell', 'accessory',
    ['站直，手肘貼身體', '彎曲手肘把啞鈴舉向肩膀', '慢慢放回'],
    ['身體後仰甩重', '手肘往前移'], '選能控制的重量。'),
  E('triceps-pushdown', '纜繩三頭下壓', 'arms', ['triceps'], 'cable', 'accessory',
    ['面向纜繩，手肘貼身體兩側', '往下壓到手臂伸直', '慢慢回到手肘約 90 度'],
    ['手肘離開身體', '用上身壓'], '手肘不適時改用繩索握把。'),
  E('plank', '棒式', 'core', ['core'], 'bodyweight', 'accessory',
    ['前臂撐地，手肘在肩膀正下方', '身體從頭到腳一直線，腹部與臀部收緊', '維持指定秒數，正常呼吸'],
    ['腰下塌', '臀部翹太高', '憋氣'], '下背痠時縮短時間。'),
  E('dead-bug', '死蟲式', 'core', ['core'], 'bodyweight', 'accessory',
    ['仰躺，手臂朝天，髖膝各 90 度', '下背貼地，對側手腳慢慢伸遠', '回到原位換邊'],
    ['下背離地', '動作太快'], '動作慢、下背貼地比次數重要。'),
  E('kb-swing', '壺鈴擺盪', 'cond', ['glutes', 'hamstrings', 'full'], 'kettlebell', 'conditioning',
    ['腳略寬於肩，屈髖把壺鈴往後送到兩腿間', '臀部用力往前推，讓壺鈴擺到胸口高度', '順勢回到屈髖'],
    ['用手臂舉壺鈴', '變成深蹲'], '先學會屈髖再做；周圍留空間。'),
  E('rower', '划船機間歇', 'cond', ['full'], 'cardio', 'conditioning',
    ['腳綁好，順序：腿推 → 身體後倒 → 手拉', '回程反過來：手 → 身體 → 腿', '依指定時間做快慢交替'],
    ['只用手拉', '彎腰駝背'], '心跳過快或頭暈請停下休息。'),
  E('bike-intervals', '飛輪間歇', 'cond', ['quads', 'full'], 'cardio', 'conditioning',
    ['調整座椅高度到踩到底時膝微彎', '快速段用力踩，慢速段輕鬆踩恢復', '依指定時間循環'],
    ['座椅太低', '快速段無阻力空轉'], '新手先從短時間、低強度開始。'),
]

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

export function filterExercises({ q = '', muscle = '', equipment = '' } = {}) {
  const s = q.trim().toLowerCase()
  return EXERCISES.filter((e) =>
    (!muscle || e.muscles.includes(muscle)) &&
    (!equipment || e.equipment === equipment) &&
    (!s || e.name.toLowerCase().includes(s) || e.id.includes(s)))
}
