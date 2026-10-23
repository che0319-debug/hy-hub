const causes = {
  OWNER_BOT_REVIEW_REQUIRED: '這張舊卡尚缺原契約的獨立核對紀錄；請由 HY 決定如何處理舊卡。',
  QUALITY_CONTRIBUTOR_EVIDENCE_INCOMPLETE: '來源執行證據不完整；系統維護者需核對紀錄後，才能指派獨立審查。',
  QUALITY_REVIEWER_IS_CONTRIBUTOR: '這個執行端曾參與成果產出，不能自審；系統需改派獨立備案。',
  REVIEWER_OFFLINE: '審查執行端心跳已過期；請恢復連線並重新輪詢。',
  REVIEW_SYSTEM_FAILURE: '主力與備案皆無法審查；請系統維護者排除異常，無須 HY 代替系統審查。',
  QUALITY_PASS_REQUIRED: '尚未通過同版本的獨立審查；請等待審查完成後再驗收。',
}
export function reviewError(value) {
  const detail = typeof value === 'string' ? value : value?.message || value?.reason
  if (!detail) return '伺服器未提供原因，請重新讀取或聯絡系統維護者。'
  return causes[detail.split(/[ :]/)[0]] || detail
}
