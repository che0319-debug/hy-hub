import test from 'node:test'
import assert from 'node:assert/strict'
import {reportFrameHtml} from '../src/lib/reportFrame.mjs'

test('chapter links use the report document without changing its content or doctype', () => {
  const source = '<!doctype html><html><head><meta charset="utf-8"></head><body><a href="#summary">Summary</a></body></html>'
  const framed = reportFrameHtml(source)
  assert.ok(framed.startsWith('<!doctype html>'))
  assert.ok(framed.includes('<head><base href="about:srcdoc"><meta'))
  assert.equal(framed.replace('<base href="about:srcdoc">', ''), source)
})

test('reports without explicit heads retain standards mode and chapter navigation', () => {
  assert.equal(reportFrameHtml('<!doctype html><html><body>Report</body></html>'), '<!doctype html><base href="about:srcdoc"><html><body>Report</body></html>')
  assert.equal(reportFrameHtml(''), '')
})
