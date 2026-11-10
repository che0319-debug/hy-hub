import { DIMENSIONS, dimensionView } from './model.mjs'
const NAMES = { 'dim-biz':'事業','dim-fin':'財務','dim-health':'健康','dim-family':'家庭','dim-job':'本業','dim-leisure':'休閒','dim-growth':'成長' }
export function goalPageSummary(document) {
  const dimensions = Object.keys(DIMENSIONS).map(id => document?.dimensions?.find(d => d.id === id)).filter(Boolean).map(d => ({ ...dimensionView(d),name:NAMES[d.id],bot:d.id==='dim-job'?'本業':DIMENSIONS[d.id].bot }))
  return { dimensions, assessed:dimensions.filter(d => d.score !== null).length }
}
