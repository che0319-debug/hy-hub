// No timer: refreshed by useWorldInfo's existing five-minute/focus cycle.
export function createGoalsStore(load) {
  let snapshot = { document: null, status: 'pending', error: null }, inFlight = null
  const subscribers = new Set()
  const emit = next => { snapshot = next; for (const f of subscribers) f() }
  const refresh = ({ force = false } = {}) => {
    if (inFlight) return force ? inFlight.then(() => refresh({ force: true })) : inFlight
    inFlight = Promise.resolve().then(load).then(document => {
      emit({ document, status: 'loaded', error: null })
      return document
    }).catch(error => {
      emit({ ...snapshot, status: 'failed', error: error.message || '資料暫時讀取失敗。' })
      return null
    }).finally(() => { inFlight = null })
    return inFlight
  }
  return { subscribe: f => { subscribers.add(f); return () => subscribers.delete(f) }, getSnapshot: () => snapshot,
    refresh, ensure: () => snapshot.status === 'pending' ? refresh() : Promise.resolve(snapshot.document) }
}
