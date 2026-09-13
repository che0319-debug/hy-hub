import { useEffect, useMemo, useState } from 'react'
import { BellRing, Bot, BrainCircuit, CalendarDays, CheckCircle2, ChevronRight, Home, ListChecks, Monitor, Pencil, RefreshCw, ShieldCheck, Target, X } from 'lucide-react'
import { fetchMobileState, fetchTodaySchedule, saveWeeklyPriorities, setMobileTaskCompleted } from '../api'
import { decideAutonomousPlan, fetchDailyOS, retryNotification, retryWorkItem, submitOperatingReview } from '../lifeOSApi'
import './mobile.css'

const TAB_META = {
  home: { label: '首頁', icon: Home },
  today: { label: '今日', icon: ListChecks },
  calendar: { label: '行事曆', icon: CalendarDays },
  bots: { label: '分身', icon: Bot },
  growth: { label: '進展', icon: Target },
}

const HY_PRINCIPLES = [
  {
    key: '狠', title: '內核強大', summary: '錨在自己，誰也判決不了我',
    logic: ['以自己為核心，專注影響圈、不理關注圈。', '男人的本能，是用盡一切方式活下來、稱王。', '不因他人的苦難而心軟，先保住自己的強大。'],
    actions: ['每日心靈盤點一次。', '每天 30 分鐘經營自己的領域。', '先分辨現實與情緒，只處理現實。'],
    metric: '情緒是否仍隨特定他人起伏。',
  },
  {
    key: '力', title: '身體健康', summary: '男人最原始的能力展現',
    logic: ['體力是所有野心的載體，身體垮了，格局歸零。'],
    actions: ['每週運動三次，固定時段；不熬夜、少高糖。', '每月自檢：髮型、鞋面、指甲、體味。', '姿態：肩開、視線平、走路放慢兩成、坐姿佔空間。', '四個缺口各配一個具體動作——減脂（腹部）、生髮方案（落髮）、保養或醫美諮詢（皮膚）、三套合身制服（服裝）。'],
    metric: '與型男之間的差距。',
  },
  {
    key: '做', title: '執行力', summary: '說了就做到，承諾即債務，才換得時間自由',
    logic: ['對於未來 5 年沒複利效益的事，就不要做，或不要太花心思做。', '要有明確的目標（量化、時間）。'],
    actions: ['每天先攻最重要的三件事。', '完整規劃出時間表。', 'AI 自動化省下的時間，全數回投到有格局的事。'],
    metric: '準時上下班、行事曆執行率；2026.08.31 前，募資 150 萬。',
  },
  {
    key: '財', title: '財務自由', summary: '經濟力是一切的基礎',
    logic: ['成功＝（努力＋機率）× 槓桿；槓桿來自團隊、資本、品牌、技術。', '沒有睡覺也能賺錢的方法，就沒有財務自由。', '要思考如何用別人的錢、銀行的錢去賺錢。', '不借錢給人，要借就當拿不回。'],
    actions: ['止血：做出不依賴呆帳回收的方案。', '開源：本業現金流＋AI 自動化。'],
    metric: '月現金流轉正，且累積可覆蓋固定支出 12 個月。',
  },
  {
    key: '權', title: '當幕後老大', summary: '拿治理權，不拿苦勞，避開風險',
    logic: ['憑情報判局，不憑感覺下注。', '決策的成本自己扛，不向任何人討認可。', '命脈不交他人手上。'],
    actions: ['談判：先設好停損與退出條件，再進場。', '建團隊：法律、財務、百工百業各有其人。', '拿否決權與財務透明，不拿最忙的位置。', '帳目隨時可見，掌握財務基礎。'],
    metric: '重大事項，無我不決。',
  },
  {
    key: '識', title: '識人用人', summary: '透過別人成事',
    logic: ['每天用每件事練習研究人性，把人推向我要的方向。', '周圍五個人的水準，就是我的水準。'],
    actions: ['不接觸第二次傷害我的人。', '不要改變他人；看懂他要什麼，把事情擺進「他做了也對他有利」的位置。對不上，換人。', '投入節奏：第一輪我先給，觀察回應；第二輪起才對等加碼。', '家人：設界線，不設停損。'],
    metric: '有多少死忠夥伴。',
  },
  {
    key: '擒', title: '兩性掌握', summary: '主動出手，收放在我',
    logic: ['保留神秘感，以自我價值來吸引、非追求。', '只要使用權，不要擁有權。', '有自己的標準，不迎合、不繞圈；敢冒犯、敢要求、敢收線。'],
    actions: ['主動開啟的對話不超過一半；回應延後 10 分鐘；對方未回前，絕不發第二則。', '發送前先想對方會怎麼接——這一則要推向升溫、邀約，還是收線。', '線上只約見面，重要的話當面說。', '主動擴大高值異性的認識量。', '單方付出只會貶值，讓對方也投入，關係才有重量。'],
    metric: '從認識到約見面的轉化率。',
  },
  {
    key: '謀', title: '主動設局', summary: '不進別人的局，自己當設局的人',
    logic: ['撒資源、給機會，只撒在算得出回報的地方。', '找出「做一次，讓下一次更容易」的動作，重複它。'],
    actions: ['刪除無效社交，每週自己開一局。', '建構可複利成長的局。'],
    metric: '每週自主支配時數持續往上。',
  },
]

function taipeiDate() {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())
}

function taipeiISODate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

const EMPTY_REVIEW = {
  summary: '', resultOutcome: '', blocker: '', nextFocus: '', learning: '',
  realityGapId: '', realityDelta: '0',
}

function shortDue(value) {
  if (!value) return ''
  return value.replaceAll('/', '-').slice(5)
}

function Empty({ children }) {
  return <p className="mobile-empty">{children}</p>
}

export default function MobileApp({ onDesktopVersion }) {
  const [tab, setTab] = useState('home')
  const [state, setState] = useState(null)
  const [events, setEvents] = useState(null)
  const [dailyOS, setDailyOS] = useState(null)
  const [error, setError] = useState('')
  const [ruleIndex, setRuleIndex] = useState(0)
  const [principleOpen, setPrincipleOpen] = useState(false)
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [weeklyDrafts, setWeeklyDrafts] = useState(['', '', ''])
  const [weeklySaving, setWeeklySaving] = useState(false)
  const [savingIds, setSavingIds] = useState(new Set())
  const [decidingId, setDecidingId] = useState('')
  const [reviewOpen, setReviewOpen] = useState('')
  const [reviewDraft, setReviewDraft] = useState(EMPTY_REVIEW)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewSaved, setReviewSaved] = useState('')
  const [retryingId, setRetryingId] = useState('')
  const [retryingNoticeId, setRetryingNoticeId] = useState('')

  async function load() {
    setError('')
    const [stateResult, scheduleResult, dailyResult] = await Promise.allSettled([
      fetchMobileState(),
      fetchTodaySchedule(),
      fetchDailyOS(),
    ])
    if (stateResult.status === 'fulfilled') setState(stateResult.value)
    else setError('目前資料讀取失敗，請稍後重試。')
    if (scheduleResult.status === 'fulfilled') {
      setEvents(scheduleResult.value.events || [])
    } else {
      setEvents([])
    }
    if (dailyResult.status === 'fulfilled') setDailyOS(dailyResult.value)
  }

  useEffect(() => { load() }, [])

  const rules = HY_PRINCIPLES
  useEffect(() => {
    if (rules.length < 2) return undefined
    const timer = setInterval(() => setRuleIndex(i => (i + 1) % rules.length), 8000)
    return () => clearInterval(timer)
  }, [rules.length])

  const attentionBots = useMemo(
    () => (state?.bots || []).filter(bot => bot.status === 'attention'),
    [state],
  )

  const approvals = dailyOS?.today?.waitingApproval || []
  const topGaps = dailyOS?.reality?.topGaps || []
  const growth = dailyOS?.growth || {}

  async function decidePlan(planId, decision) {
    setDecidingId(planId)
    try {
      await decideAutonomousPlan(planId, decision)
      await load()
    } catch {
      setError('核准狀態未能儲存，請再試一次。')
    } finally {
      setDecidingId('')
    }
  }

  async function toggleTask(task, completed) {
    setSavingIds(prev => new Set(prev).add(task.id))
    setState(prev => ({
      ...prev,
      todayTasks: prev.todayTasks.map(item => item.id === task.id ? { ...item, completed } : item),
      weeklyTop3: prev.weeklyTop3.map(item => item.id === task.id ? { ...item, completed } : item),
      todayCompleted: completed
        ? [{ ...task, completed: true }, ...(prev.todayCompleted || []).filter(item => item.id !== task.id)]
        : (prev.todayCompleted || []).filter(item => item.id !== task.id),
    }))
    try {
      await setMobileTaskCompleted(task.source, task.id, completed)
    } catch {
      setState(prev => ({
        ...prev,
        todayTasks: prev.todayTasks.map(item => item.id === task.id ? { ...item, completed: !completed } : item),
        weeklyTop3: prev.weeklyTop3.map(item => item.id === task.id ? { ...item, completed: !completed } : item),
        todayCompleted: completed
          ? (prev.todayCompleted || []).filter(item => item.id !== task.id)
          : [{ ...task, completed: true }, ...(prev.todayCompleted || []).filter(item => item.id !== task.id)],
      }))
      setError('代辦狀態未能儲存，請再試一次。')
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  function editWeekly() {
    const items = state.weeklyTop3 || []
    setWeeklyDrafts([0, 1, 2].map(i => items[i]?.title || ''))
    setWeeklyOpen(true)
  }

  async function commitWeekly() {
    const items = weeklyDrafts.map(title => title.trim()).filter(Boolean).map((title, index) => ({
      id: state.weeklyTop3?.[index]?.source === 'weekly' ? state.weeklyTop3[index].id : `weekly-${Date.now()}-${index + 1}`,
      title,
      completed: false,
    }))
    setWeeklySaving(true)
    try {
      const result = await saveWeeklyPriorities(items)
      setState(prev => ({ ...prev, weeklyTop3: result.items }))
      setWeeklyOpen(false)
    } catch {
      setError('本週重點未能儲存，請再試一次。')
    } finally {
      setWeeklySaving(false)
    }
  }

  function openReview(period) {
    const previous = period === 'daily' ? growth.latestDailyReview : growth.latestWeeklyReview
    setReviewDraft(previous ? {
      summary: previous.summary || '', resultOutcome: '', blocker: previous.blocker || '',
      nextFocus: previous.nextFocus || '', learning: '', realityGapId: '', realityDelta: '0',
    } : EMPTY_REVIEW)
    setReviewSaved('')
    setReviewOpen(period)
  }

  function updateReview(field, value) {
    setReviewDraft(previous => ({ ...previous, [field]: value }))
  }

  async function saveReview() {
    if (!reviewDraft.summary.trim()) {
      setError('請先填寫回顧摘要。')
      return
    }
    setReviewSaving(true)
    setError('')
    const key = globalThis.crypto?.randomUUID?.() || `${reviewOpen}-${Date.now()}`
    try {
      await submitOperatingReview({
        ...reviewDraft,
        period: reviewOpen,
        date: taipeiISODate(),
        realityDelta: Number(reviewDraft.realityDelta || 0),
      }, key)
      await load()
      setReviewSaved(reviewOpen)
      setReviewOpen('')
    } catch (err) {
      setError(err?.message || '覆盤未能儲存，請再試一次。')
    } finally {
      setReviewSaving(false)
    }
  }

  async function retryWorkerItem(workId) {
    setRetryingId(workId)
    setError('')
    try {
      await retryWorkItem(workId)
      await load()
    } catch (err) {
      setError(err?.message || '工作未能重新排隊，請再試一次。')
    } finally {
      setRetryingId('')
    }
  }

  async function retryTelegramNotice(notificationId) {
    setRetryingNoticeId(notificationId)
    setError('')
    try {
      await retryNotification(notificationId)
      await load()
    } catch (err) {
      setError(err?.message || 'Telegram 通知重送失敗，請稍後再試。')
    } finally {
      setRetryingNoticeId('')
    }
  }

  return (
    <div className="mobile-life-os">
      <header className="mobile-header">
        <div>
          <p className="mobile-kicker">HY LIFE OS</p>
          <h1>{TAB_META[tab].label}</h1>
          <p>{taipeiDate()}</p>
        </div>
        <button type="button" className="mobile-desktop-switch" onClick={onDesktopVersion}>
          <Monitor size={16} />
          完整版
        </button>
      </header>

      <main className="mobile-content">
        {error && <div className="mobile-error">{error}</div>}
        {!state && !error && <Empty>載入中…</Empty>}

        {tab === 'home' && state && (
          <>
            <section className="mobile-now">
              <div className="mobile-section-title">
                <h2>今天只看這裡</h2>
                <span>{dailyOS?.version ? '即時整合' : '基本模式'}</span>
              </div>
              <div className="mobile-dashboard-grid">
                <div className="mobile-metric"><strong>{events?.length || 0}</strong><span>今日行程</span></div>
                <div className="mobile-metric"><strong>{state.todayTasks.filter(item => !item.completed).length}</strong><span>待完成</span></div>
                <div className="mobile-metric is-warning"><strong>{approvals.length}</strong><span>待核准</span></div>
              </div>
            </section>
            <button
              type="button"
              className="mobile-card mobile-rule"
              onClick={() => setPrincipleOpen(true)}
            >
              <span>HY 人生心法・{ruleIndex + 1}/{rules.length}</span>
              <strong>{rules[ruleIndex].key}｜{rules[ruleIndex].summary}</strong>
              <small>查看完整心法 <ChevronRight size={14} /></small>
            </button>

            <section>
              <div className="mobile-section-title">
                <h2>本週最重要 3 件事</h2>
                <button type="button" onClick={editWeekly} aria-label="編輯本週三件事"><Pencil size={16} /></button>
              </div>
              <div className="mobile-card">
                {(state.weeklyTop3 || []).length === 0 ? (
                  <Empty>本週尚未排定有期限的重點。</Empty>
                ) : state.weeklyTop3.map((item, index) => (
                  <label className={`mobile-priority ${item.completed ? 'is-complete' : ''}`} key={item.id}>
                    <b>{index + 1}</b>
                    <span>{item.title}</span>
                    {item.source === 'weekly' ? (
                      <input type="checkbox" checked={item.completed} onChange={event => toggleTask(item, event.target.checked)} />
                    ) : <small>{item.sourceLabel}</small>}
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h2>今日成果</h2>
              <div className="mobile-card mobile-results">
                <div className="mobile-result-count"><strong>{(state.todayCompleted || []).length}</strong><span>件完成</span></div>
                <div>
                  {(state.todayCompleted || []).length === 0 ? <Empty>完成一件事後，成果會出現在這裡。</Empty> : (
                    <ul>{state.todayCompleted.slice(0, 3).map(item => <li key={`${item.source}-${item.id}`}>{item.title}</li>)}</ul>
                  )}
                </div>
              </div>
            </section>

            {state.largestGap && (
              <div className="mobile-card mobile-compact">
                <span>目前最大差距</span>
                <strong>{state.largestGap.name}・差距 {state.largestGap.gap}</strong>
              </div>
            )}

            {attentionBots.length > 0 && (
              <div className="mobile-card mobile-attention">
                <span>需要你決定</span>
                <strong>{attentionBots[0].name}：{attentionBots[0].current || '有工作等待確認'}</strong>
              </div>
            )}

            {approvals.length > 0 && (
              <section>
                <h2>待我核准</h2>
                <div className="mobile-list">
                  {approvals.slice(0, 3).map(plan => (
                    <article className="mobile-approval" key={plan.id}>
                      <span><ShieldCheck size={16} />{plan.owner || 'AI'} 準備開始</span>
                      <strong>{plan.title}</strong>
                      {plan.whyNow && <small>{plan.whyNow}</small>}
                      <div>
                        <button disabled={decidingId === plan.id} onClick={() => decidePlan(plan.id, 'approve')}>核准</button>
                        <button disabled={decidingId === plan.id} onClick={() => decidePlan(plan.id, 'approve_with_judgment')}>核准＋自行判斷</button>
                        <button disabled={decidingId === plan.id} onClick={() => decidePlan(plan.id, 'reject')}>取消</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === 'today' && state && (
          <section>
            <div className="mobile-section-title">
              <h2>今日代辦</h2>
              <span>{state.todayTasks.filter(item => item.completed).length}/{state.todayTasks.length}</span>
            </div>
            <div className="mobile-list">
              {state.todayTasks.length === 0 ? <Empty>今天沒有到期或逾期代辦。</Empty> : state.todayTasks.map(item => (
                <label className={`mobile-task ${item.completed ? 'is-complete' : ''}`} key={item.id}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={savingIds.has(item.id)}
                    onChange={event => toggleTask(item, event.target.checked)}
                  />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.sourceLabel}・{shortDue(item.due)}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {tab === 'calendar' && (
          <section>
            <div className="mobile-section-title">
              <h2>今日行程</h2>
              <span>{events?.length || 0} 個</span>
            </div>
            <div className="mobile-list">
              {events === null ? <Empty>載入中…</Empty> : events.length === 0 ? <Empty>今天沒有行程。</Empty> : events
                .slice()
                .sort((a, b) => (a.start || '').localeCompare(b.start || ''))
                .map((event, index) => (
                  <div className="mobile-event" key={`${event.start}-${event.title}-${index}`}>
                    <time>{event.start || '全天'}</time>
                    <strong>{event.title}</strong>
                  </div>
                ))}
            </div>
          </section>
        )}

        {tab === 'bots' && state && (
          <section>
            <div className="mobile-section-title">
              <h2>四個數位分身</h2>
              <button type="button" onClick={load} aria-label="重新整理">
                <RefreshCw size={17} />
              </button>
            </div>
            <div className="mobile-governance"><ShieldCheck size={16} /><span>跨領域與重大決策一律由 HY 核准</span></div>
            <div className="mobile-list">
              {state.bots.map(bot => {
                const self = dailyOS?.agents?.[bot.id] || {}
                const counts = self.proposals?.counts || {}
                return (
                  <article className={`mobile-bot-card mobile-bot-${bot.status}`} key={bot.id}>
                    <div className="mobile-bot-head">
                      <i />
                      <span><strong>{bot.name}・{bot.statusLabel}</strong><small>{bot.current || '目前沒有執行中的工作'}</small></span>
                      {bot.status === 'idle' && <CheckCircle2 size={17} />}
                    </div>
                    {self.mission && <p>{self.mission}</p>}
                    <div className="mobile-proposal-counts">
                      <span><b>{counts.work || 0}</b>工作</span>
                      <span><b>{counts.results || 0}</b>成果</span>
                      <span><b>{counts.risks || 0}</b>風險</span>
                      <span><b>{counts.recommendations || 0}</b>建議</span>
                    </div>
                    {(self.domains || []).length > 0 && <div className="mobile-domain-tags">{self.domains.map(domain => <small key={domain}>{domain}</small>)}</div>}
                    <footer>{self.decisionAuthority === 'final' ? '最終決策者' : '領域內執行・重大事項升級 HY'}</footer>
                  </article>
                )
              })}
            </div>
            {dailyOS?.worker && (
              <section className="mobile-worker-section">
                <div className="mobile-section-title"><h2>AI Worker</h2><span>安全文字工作</span></div>
                <div className="mobile-card mobile-worker-metrics">
                  <span><b>{dailyOS.worker.counts?.queued || 0}</b>排隊</span>
                  <span><b>{dailyOS.worker.counts?.running || 0}</b>執行中</span>
                  <span><b>{dailyOS.worker.counts?.needs_clarification || 0}</b>待補充</span>
                  <span><b>{dailyOS.worker.counts?.failed || 0}</b>失敗</span>
                </div>
                {(dailyOS.worker.retryable || []).map(item => (
                  <article className="mobile-worker-failure" key={item.id}>
                    <span><strong>{item.title || '未命名工作'}</strong><small>{item.owner}・嘗試 {item.attempt}/{item.maxAttempts}</small></span>
                    <button type="button" disabled={retryingId === item.id} onClick={() => retryWorkerItem(item.id)}>{retryingId === item.id ? '排隊中' : '重試'}</button>
                  </article>
                ))}
                {dailyOS.worker.exhausted > 0 && <p className="mobile-worker-exhausted">{dailyOS.worker.exhausted} 件已達重試上限，需要 HY 檢查原因。</p>}
              </section>
            )}
            {dailyOS?.notifications && (
              <section className="mobile-notification-section">
                <div className="mobile-section-title"><h2>主動通知</h2><span><BellRing size={14} /> Telegram</span></div>
                <div className={`mobile-card mobile-notification-health is-${dailyOS.notifications.health}`}>
                  <span><b>{dailyOS.notifications.counts?.pending || 0}</b>待送</span>
                  <span><b>{dailyOS.notifications.counts?.failed || 0}</b>失敗</span>
                  <span><b>{dailyOS.notifications.counts?.delivered || 0}</b>已送達</span>
                  <span><b>{dailyOS.notifications.dedupeProtected || 0}</b>防重送</span>
                </div>
                {(dailyOS.notifications.retryable || []).map(item => (
                  <article className="mobile-notification-failure" key={item.id}>
                    <span><strong>{item.title}</strong><small>{item.type || '通知'}・已嘗試 {item.attempts} 次</small></span>
                    <button type="button" disabled={retryingNoticeId === item.id} onClick={() => retryTelegramNotice(item.id)}>{retryingNoticeId === item.id ? '重送中' : '重送'}</button>
                  </article>
                ))}
                {dailyOS.notifications.health === 'healthy' && <p className="mobile-notification-ok"><CheckCircle2 size={15} />通知通道正常，已送達項目不會重複發送。</p>}
              </section>
            )}
          </section>
        )}

        {tab === 'growth' && state && (
          <>
            <section>
              <div className="mobile-section-title"><h2>Reality Gap</h2><span>{topGaps.length} 項</span></div>
              <div className="mobile-list">
                {topGaps.length === 0 ? <Empty>目前沒有可顯示的差距。</Empty> : topGaps.map(gap => (
                  <div className="mobile-gap" key={gap.id || gap.dimension}>
                    <span><strong>{gap.dimension || gap.name || '未命名差距'}</strong><small>差距 {gap.gap}</small></span>
                    <div><i style={{ width: `${Math.max(4, Math.min(100, Number(gap.gap) || 0))}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <div className="mobile-section-title"><h2>AI Learning</h2><BrainCircuit size={17} /></div>
              <div className="mobile-card mobile-learning">
                <div><span>待改善</span><strong>{(growth.selfGaps || []).filter(item => item.status !== 'closed').length}</strong></div>
                <div><span>已吸收學習</span><strong>{growth.acceptedLearnings || 0}</strong></div>
                <p>{growth.latestReview ? (growth.latestReview.summary || growth.latestReview.title || '最近一次覆盤已建立') : '完成任務並留下 Result 後，AI 會從成果持續校正。'}</p>
              </div>
            </section>
            <section>
              <h2>晚間回顧與週覆盤</h2>
              <div className="mobile-card mobile-review-actions">
                {reviewSaved && <p className="mobile-review-success"><CheckCircle2 size={16} />覆盤已寫入 Life OS 閉環</p>}
                <button type="button" onClick={() => openReview('daily')}>
                  <span><b>今晚</b><small>{growth.latestDailyReview?.date ? `上次 ${growth.latestDailyReview.date}` : 'Results・卡點・明日第一步'}</small></span>
                  <ChevronRight size={18} />
                </button>
                <button type="button" onClick={() => openReview('weekly')}>
                  <span><b>本週</b><small>{growth.latestWeeklyReview?.date ? `上次 ${growth.latestWeeklyReview.date}` : '成果・Reality Gap・下週重點'}</small></span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {principleOpen && (
        <div className="principle-overlay" role="dialog" aria-modal="true" aria-label="HY 人生心法">
          <div className="principle-sheet">
            <div className="principle-sheet-head">
              <div>
                <span>HY 人生心法・{ruleIndex + 1}/{rules.length}</span>
                <h2>{rules[ruleIndex].key}｜{rules[ruleIndex].title}</h2>
              </div>
              <button type="button" onClick={() => setPrincipleOpen(false)} aria-label="關閉"><X size={21} /></button>
            </div>
            <p className="principle-summary">{rules[ruleIndex].summary}</p>
            <h3>底層邏輯</h3>
            <ul>{rules[ruleIndex].logic.map(item => <li key={item}>{item}</li>)}</ul>
            <h3>行動</h3>
            <ul>{rules[ruleIndex].actions.map(item => <li key={item}>{item}</li>)}</ul>
            <div className="principle-metric"><span>指標</span><strong>{rules[ruleIndex].metric}</strong></div>
            <div className="principle-pager">
              <button type="button" onClick={() => setRuleIndex(i => (i + rules.length - 1) % rules.length)}>上一則</button>
              <button type="button" onClick={() => setRuleIndex(i => (i + 1) % rules.length)}>下一則</button>
            </div>
          </div>
        </div>
      )}

      {weeklyOpen && (
        <div className="principle-overlay" role="dialog" aria-modal="true" aria-label="編輯本週最重要三件事">
          <div className="principle-sheet weekly-editor">
            <div className="principle-sheet-head">
              <div><span>首頁與 Dashboard 同步</span><h2>本週最重要 3 件事</h2></div>
              <button type="button" onClick={() => setWeeklyOpen(false)} aria-label="關閉"><X size={21} /></button>
            </div>
            <div className="weekly-editor-fields">
              {weeklyDrafts.map((value, index) => (
                <label key={index}><b>{index + 1}</b><input value={value} maxLength={100} placeholder={`第 ${index + 1} 件重要事項`} onChange={event => setWeeklyDrafts(items => items.map((item, i) => i === index ? event.target.value : item))} /></label>
              ))}
            </div>
            <button type="button" className="weekly-save" disabled={weeklySaving} onClick={commitWeekly}>{weeklySaving ? '儲存中…' : '儲存並同步'}</button>
          </div>
        </div>
      )}

      {reviewOpen && (
        <div className="principle-overlay" role="dialog" aria-modal="true" aria-label={reviewOpen === 'daily' ? '晚間回顧' : '週覆盤'}>
          <div className="principle-sheet review-editor">
            <div className="principle-sheet-head">
              <div><span>寫入 Result → Gap → Learning</span><h2>{reviewOpen === 'daily' ? '晚間回顧' : '週覆盤'}</h2></div>
              <button type="button" onClick={() => setReviewOpen('')} aria-label="關閉"><X size={21} /></button>
            </div>
            <div className="review-fields">
              <label><span>一句話總結 *</span><textarea value={reviewDraft.summary} maxLength={1200} placeholder="今天／本週最重要的判斷" onChange={event => updateReview('summary', event.target.value)} /></label>
              <label><span>完成的成果</span><textarea value={reviewDraft.resultOutcome} maxLength={1200} placeholder="具體完成了什麼；填寫後建立 canonical Result" onChange={event => updateReview('resultOutcome', event.target.value)} /></label>
              <label><span>卡點</span><textarea value={reviewDraft.blocker} maxLength={1200} placeholder="什麼拖慢或阻礙了進展" onChange={event => updateReview('blocker', event.target.value)} /></label>
              <label><span>{reviewOpen === 'daily' ? '明日第一步' : '下週第一步'}</span><textarea value={reviewDraft.nextFocus} maxLength={1200} placeholder="下一個最小可執行動作" onChange={event => updateReview('nextFocus', event.target.value)} /></label>
              <label><span>要讓 AI 記住的學習</span><textarea value={reviewDraft.learning} maxLength={1200} placeholder="需先填成果；儲存後成為已核准 Learning 與 Memory" onChange={event => updateReview('learning', event.target.value)} /></label>
              <div className="review-gap-fields">
                <label><span>推進 Reality Gap</span><select value={reviewDraft.realityGapId} onChange={event => updateReview('realityGapId', event.target.value)}><option value="">不更新</option>{topGaps.map(gap => <option key={gap.id} value={gap.id}>{gap.dimension || gap.name}（差距 {gap.gap}）</option>)}</select></label>
                <label><span>進展值</span><input type="number" min="-20" max="20" value={reviewDraft.realityDelta} onChange={event => updateReview('realityDelta', event.target.value)} /></label>
              </div>
              <small className="review-hint">更新 Gap 或 AI Learning 時，必須同時填寫「完成的成果」，確保每次校正都有 Result 證據。</small>
            </div>
            <button type="button" className="weekly-save" disabled={reviewSaving} onClick={saveReview}>{reviewSaving ? '寫入閉環中…' : '完成覆盤並同步'}</button>
          </div>
        </div>
      )}

      <nav className="mobile-nav" aria-label="手機版主要分頁">
        {Object.entries(TAB_META).map(([id, meta]) => {
          const Icon = meta.icon
          return (
            <button
              type="button"
              key={id}
              className={tab === id ? 'is-active' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              <Icon size={20} />
              <span>{meta.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
