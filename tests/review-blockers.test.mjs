import test from 'node:test'
import assert from 'node:assert/strict'
import {reviewError} from '../src/lib/reviewErrors.mjs'
import {journal,activityLabel} from '../src/lib/aiOffice.mjs'
test('review failures explain the cause and preserve unknown details',()=>{
 assert.match(reviewError('QUALITY_CONTRIBUTOR_EVIDENCE_INCOMPLETE'),/來源執行證據不完整/)
 assert.match(reviewError('OWNER_BOT_REVIEW_REQUIRED'),/舊卡/)
 assert.match(reviewError('QUALITY_PASS_REQUIRED: OWNER_CHECK'),/同版本/)
 assert.equal(reviewError('new detail'),'new detail')
})
test('review notices never become actionable decisions or human speech',()=>{
 const event=journal({notes:[{id:'review',author:'system:review',content:'審查改派',created_at:10}]})[0]
 assert.equal(event.kind,'notification');assert.equal(event.actor,'審查系統');assert.equal(event.action,undefined)
})

test('system blockers are not labelled as waiting for AI or HY',()=>assert.equal(activityLabel({system_blockers:[{code:'REVIEW_SYSTEM_FAILURE'}],status:'ai_pending'}),'系統阻塞'))
