// 待確認卡要驗收的成果：綁工作包的卡看該工作包；未綁的 Milestone 驗收看該 Milestone 的工作包。
// 回傳 [{ id, task, summary, outputs, files:[{file_id, filename}] }]，只列已交件（COMPLETED 結果）的工作包。
export function reviewDeliverables(project, item) {
  const packages = project?.packages || []
  const files = project?.files || []
  let related = []
  if (item?.work_package_id) related = packages.filter(p => p.id === item.work_package_id)
  else if (item?.action_type === 'MILESTONE_REVIEW' && item.title)
    related = packages.filter(p => p.milestone_id === item.title && p.type !== 'PROJECT_PLANNING')
  return related
    .filter(p => p.result?.status === 'COMPLETED')
    .map(p => {
      const ids = new Set((p.result.artifacts || []).map(a => a?.file_id).filter(Boolean))
      const own = files.filter(f => f.work_package_id === p.id || ids.has(f.file_id))
      for (const id of ids) if (!own.some(f => f.file_id === id)) own.push({ file_id: id, filename: id })
      return { id: p.id, task: p.task, summary: p.result.summary || '', outputs: p.result.outputs || [], files: own }
    })
}

export const driveFileUrl = id => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`
