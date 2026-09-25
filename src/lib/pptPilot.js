export function reviewSlides(slides) {
  return slides.flatMap((slide, index) => {
    const issues = []
    if (!slide.title?.trim()) issues.push({ slide: index + 1, issue: '缺少標題', suggestion: '補上能表達本頁結論的標題' })
    if (!slide.body?.trim()) issues.push({ slide: index + 1, issue: '缺少內容', suggestion: '填入支持標題的關鍵資料或下一步' })
    return issues
  })
}

export function makeOutline(topic) {
  return [
    { title: `${topic || '簡報主題'}｜目標`, body: '說明對象、問題與希望達成的結果。' },
    { title: '方案與證據', body: '' },
    { title: '下一步', body: '列出待驗證事項與決策點。' },
  ]
}
