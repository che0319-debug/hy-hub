// Lists read only summaries, following all package pages so counts stay exact.
export async function readProjectSummary(read, path) {
  const first = await read(`${path}?detail=summary&package_limit=100`)
  let next = first.pagination?.packages?.next_offset
  while (next != null) {
    const page = await read(`${path}?detail=summary&package_limit=100&package_offset=${next}`)
    first.packages.push(...page.packages)
    const following = page.pagination?.packages?.next_offset
    if (following != null && following <= next) throw new Error('工作包分頁未前進')
    next = following
  }
  return first
}

