import { DIMENSIONS, DIMENSION_NAMES, dimensionView } from './model.mjs'
export function goalPageSummary(document) {
  const dimensions = Object.keys(DIMENSIONS).map(id => document?.dimensions?.find(d => d.id === id)).filter(Boolean).map(d => ({ ...dimensionView(d),name:DIMENSION_NAMES[d.id],bot:d.id==='dim-job'?'本業':DIMENSIONS[d.id].bot }))
  return { dimensions, assessed:dimensions.filter(d => d.score !== null).length }
}
