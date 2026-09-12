import { useEffect, useMemo, useState } from 'react'
import { Bot, CalendarDays, CheckCircle2, Home, ListChecks, Monitor, RefreshCw } from 'lucide-react'
import { fetchMobileState, fetchTodaySchedule, setMobileTaskCompleted } from '../api'
import './mobile.css'

const TAB_META = {
  home: { label: '首頁', icon: Home },
  today: { label: '今日', icon: ListChecks },
  calendar: { label: '行事曆', icon: CalendarDays },
  bots: { label: '分身', icon: Bot },
}

const DEFAULT_RULE = '讓本人需要做的低價值工作越來越少。'

function taipeiDate() {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())
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
  const [error, setError] = useState('')
  const [ruleIndex, setRuleIndex] = useState(0)
  const [savingIds, setSavingIds] = useState(new Set())

  async function load() {
    setError('')
    const [stateResult, scheduleResult] = await Promise.allSettled([
      fetchMobileState(),
      fetchTodaySchedule(),
    ])
    if (stateResult.status === 'fulfilled') setState(stateResult.value)
    else setError('目前資料讀取失敗，請稍後重試。')
    if (scheduleResult.status === 'fulfilled') {
      setEvents(scheduleResult.value.events || [])
    } else {
      setEvents([])
    }
  }

  useEffect(() => { load() }, [])

  const rules = state?.rules?.length ? state.rules : [DEFAULT_RULE]
  useEffect(() => {
    if (rules.length < 2) return undefined
    const timer = setInterval(() => setRuleIndex(i => (i + 1) % rules.length), 8000)
    return () => clearInterval(timer)
  }, [rules.length])

  const attentionBots = useMemo(
    () => (state?.bots || []).filter(bot => bot.status === 'attention'),
    [state],
  )

  async function toggleTask(task, completed) {
    setSavingIds(prev => new Set(prev).add(task.id))
    setState(prev => ({
      ...prev,
      todayTasks: prev.todayTasks.map(item => item.id === task.id ? { ...item, completed } : item),
    }))
    try {
      await setMobileTaskCompleted(task.source, task.id, completed)
    } catch {
      setState(prev => ({
        ...prev,
        todayTasks: prev.todayTasks.map(item => item.id === task.id ? { ...item, completed: !completed } : item),
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
            <button
              type="button"
              className="mobile-card mobile-rule"
              onClick={() => setRuleIndex(i => (i + 1) % rules.length)}
            >
              <span>自我守則・{ruleIndex + 1}/{rules.length}</span>
              <strong>{rules[ruleIndex]}</strong>
            </button>

            <section>
              <h2>本週最重要 3 件事</h2>
              <div className="mobile-card">
                {(state.weeklyTop3 || []).length === 0 ? (
                  <Empty>本週尚未排定有期限的重點。</Empty>
                ) : state.weeklyTop3.map((item, index) => (
                  <div className="mobile-priority" key={item.id}>
                    <b>{index + 1}</b>
                    <span>{item.title}</span>
                    <small>{item.sourceLabel}</small>
                  </div>
                ))}
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
              <h2>Bot 狀況</h2>
              <button type="button" onClick={load} aria-label="重新整理">
                <RefreshCw size={17} />
              </button>
            </div>
            <div className="mobile-list">
              {state.bots.map(bot => (
                <div className={`mobile-bot mobile-bot-${bot.status}`} key={bot.id}>
                  <i />
                  <span>
                    <strong>{bot.name}・{bot.statusLabel}</strong>
                    <small>{bot.current || '目前沒有執行中的工作'}</small>
                  </span>
                  {bot.status === 'idle' && <CheckCircle2 size={17} />}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

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
