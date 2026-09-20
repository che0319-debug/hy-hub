import { useEffect, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import {
  AUTH_EXPIRED_EVENT,
  clearAccessToken,
  getAccessToken,
  loginWithPassword,
  validateSession,
} from '../auth'

export default function AuthGate({ children }) {
  const [state, setState] = useState(getAccessToken() ? 'checking' : 'login')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const handleExpired = () => {
      setPassword('')
      setError('登入已過期，請重新登入')
      setState('login')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [])

  useEffect(() => {
    if (state !== 'checking') return
    validateSession()
      .then(ok => setState(ok ? 'ready' : 'login'))
      .catch(() => {
        clearAccessToken()
        setState('login')
      })
  }, [state])

  async function submit(event) {
    event.preventDefault()
    if (!password) {
      setError('請輸入登入密碼')
      return
    }
    setState('submitting')
    setError('')
    try {
      await loginWithPassword(password)
      setPassword('')
      setState('ready')
    } catch (err) {
      if (err.status === 429) setError('嘗試次數過多，請稍後再試')
      else if (err.status === 503) setError('手機登入尚未完成設定')
      else setError('密碼不正確')
      setState('login')
    }
  }

  if (state === 'ready') return children

  if (state === 'checking') {
    return (
      <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
        <p className="text-sm text-slate-400">確認登入狀態…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
      <section className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600">
            <LockKeyhole size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold">HY Life OS</h1>
            <p className="text-sm text-slate-400">Canonical Operations Hub</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">登入密碼</span>
            <input
              autoFocus
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              placeholder="輸入密碼"
            />
          </label>

          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={event => setShowPassword(event.target.checked)}
              className="h-5 w-5"
            />
            顯示密碼
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={state === 'submitting'}
            className="min-h-12 w-full rounded-xl bg-blue-600 px-4 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {state === 'submitting' ? '登入中…' : '登入'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          工作階段只保留在目前的瀏覽器分頁。
        </p>
      </section>
    </main>
  )
}
