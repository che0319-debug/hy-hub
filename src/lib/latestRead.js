// 重疊的 Bot Office 讀取只採最新一次。
// 呼叫端的 promise 跟著最新票號：最新一次已經寫進 state 才 resolve；最新一次失敗才 reject。
// 被換掉的請求不要自己 resolve，否則選擇器會在舊快照上顯示儲存成功。

export function createLatestRead() {
  let generation = 0
  let latestTicket = 0
  let latestPromise = Promise.resolve()

  function begin(run) {
    const ticket = ++generation
    latestTicket = ticket
    let resolve, reject
    const promise = new Promise((res, rej) => { resolve = res; reject = rej })
    latestPromise = promise
    let closed = false
    const isCurrent = () => ticket === generation
    const finish = (outcome, error) => {
      if (closed) return
      closed = true
      const dropped = ticket !== generation || outcome?.status === 'stale' || error?.name === 'AbortError'
      if (dropped) {
        // 有較新的一次就跟它；沒有（卸載、中止）就不要假裝成功。
        if (latestTicket !== ticket) latestPromise.then(resolve, reject)
        else reject(Object.assign(new Error('讀取已被取代'), { name: 'StaleRead' }))
        return
      }
      if (error) reject(error)
      else resolve(outcome?.value)
    }
    try {
      Promise.resolve(run(ticket, isCurrent)).then(
        outcome => finish(outcome, null),
        error => finish(null, error),
      )
    } catch (error) {
      finish(null, error)
    }
    return promise
  }

  return {
    begin,
    bump() { generation += 1 },
    get generation() { return generation },
  }
}

// current：這次仍是最新，而且呼叫端還活著。empty 已是一份完整結果，要落地並 resolve。
export function officeReadDecision({ current, error } = {}) {
  if (!current || error?.name === 'AbortError') return 'stale'
  if (!error) return 'apply'
  if (error.kind === 'empty') return 'apply-empty'
  return 'fail'
}

export function readOfficeLatest(gate, { load, isActive, onApply, onEmpty, onFail, onSettled } = {}) {
  return gate.begin((ticket, isCurrent) => {
    const current = () => (isActive ? isActive(isCurrent) : isCurrent())
    let pending
    try { pending = load() }
    catch (error) { pending = Promise.reject(error) }
    return Promise.resolve(pending).then(data => {
      if (officeReadDecision({ current: current(), error: null }) !== 'apply') return { status: 'stale' }
      onApply?.(data)
      onSettled?.()
      return { status: 'applied', value: data }
    }, error => {
      const decision = officeReadDecision({ current: current(), error })
      if (decision === 'stale') return { status: 'stale' }
      if (decision === 'apply-empty') {
        onEmpty?.(error)
        onSettled?.()
        return { status: 'applied', value: null }
      }
      onFail?.(error)
      onSettled?.()
      throw error
    })
  })
}
