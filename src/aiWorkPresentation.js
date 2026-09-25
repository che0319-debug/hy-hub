// Persisted presentation metadata. Full goals remain in canonical project data.
// Generate illustrations once and commit assets; never generate during rendering.
export const projectPresentation = {
  'test-4f7586ad-a30b-454c-92e7-f3d96e02e730': {
    goalSummary: '建立居家無器材健身課表',
    image: 'home-fitness-v1.webp',
    imageAlt: '居家無器材運動示意圖',
  },
  'project-chatgpt-589d1016d6af08b6': {
    goalSummary: '開發整合規劃、審查與製作的簡報助手',
    image: 'ppt-workstation-v1.webp',
    imageAlt: '簡報工作台示意圖',
  },
  'project-chatgpt-840acca073f631c8': {
    goalSummary: '打造川嶼蛋糕品牌，半年月營收達30萬',
    image: 'kawayu-cake-v1.webp',
    imageAlt: '川嶼蛋糕品牌情境示意圖',
  },
}

export function getProjectPresentation(project) {
  const saved = projectPresentation[project.id] || {}
  const summary = project.goalSummary || saved.goalSummary || ''
  return {
    // Invalid or absent summaries never fall back to dumping/truncating the full request.
    goalSummary: summary && Array.from(summary).length <= 25 ? summary : '目標摘要待整理',
    imageUrl: project.thumbnailUrl || (saved.image ? `${import.meta.env.BASE_URL}ai-work/${saved.image}` : ''),
    imageAlt: saved.imageAlt || '專案示意圖',
  }
}
