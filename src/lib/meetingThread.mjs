// 會議室對話：有時間的最新在上。同一時間維持原本順序。沒有時間的留在最後，不倒插到最新。

export function meetingConversationOrder(events) {
  const rows = Array.isArray(events) ? events : []
  const dated = []
  const undated = []
  rows.forEach((event, index) => {
    const at = typeof event?.at === 'number' && Number.isFinite(event.at) && event.at > 0 ? event.at : null
    if (at) dated.push({ event, index, at })
    else undated.push({ event, index })
  })
  dated.sort((a, b) => b.at - a.at || a.index - b.index)
  undated.sort((a, b) => a.index - b.index)
  return [...dated.map(item => item.event), ...undated.map(item => item.event)]
}
