import test from 'node:test'
import assert from 'node:assert/strict'
import { laneLabel } from '../src/lib/lanes.js'

test('AI Office work channel follows the stored package executor', () => {
  const planning = { type: 'PROJECT_PLANNING', executor: 'GPT_CHAT' }
  assert.equal(laneLabel(planning.executor), 'GPT Chat 對話通道')
  assert.equal(laneLabel('CHATGPT_WORK'), 'GPT Work')
  assert.equal(laneLabel('CODEX'), 'Claude 程式通道')
  assert.equal(laneLabel('CLAUDE_REVIEW'), 'Claude 獨立審查')
  assert.equal(laneLabel('FUTURE'), 'FUTURE')
})
