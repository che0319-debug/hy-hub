// 邊界：健身教練不得連 HY Life OS 或任何模型 API；只有 Service Worker 會對同源發出 fetch。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../public/fitness-coach/', import.meta.url))
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
const files = walk(ROOT).filter((f) => /\.(js|html|json|webmanifest|css)$/.test(f))
const FORBIDDEN = [/onrender\.com/i, /hy-agent-v2/i, /lifeOSApi|hy-life-os-api/i, /api\.openai\.com/i, /api\.anthropic\.com/i, /generativelanguage\.googleapis/i, /api\.x\.ai/i, /openrouter/i, /XMLHttpRequest/, /WebSocket/, /sendBeacon/]

test('沒有 HY Life OS 或付費模型 API 的網址與連線方式', () => {
  assert.ok(files.length >= 8)
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    for (const re of FORBIDDEN) assert.ok(!re.test(text), `${f} 含有禁止的 ${re}`)
  }
})

test('fetch 只出現在 Service Worker，且只處理同源請求', () => {
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    if (f.endsWith('sw.js')) {
      assert.match(text, /url\.origin !== self\.location\.origin\) return/)
    } else {
      assert.ok(!/\bfetch\s*\(/.test(text), `${f} 不應呼叫 fetch`)
    }
  }
})

test('Service Worker 快取清單涵蓋所有 App 檔案（離線可開）', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8')
  const need = ['index.html', 'app.js', 'fitness.css', 'lib/store.js', 'lib/inbody.js', 'lib/coach.js', 'lib/programs.js', 'lib/exercises.js', '../hy-ui/hy-ui.css']
  for (const n of need) assert.ok(sw.includes(`'${n}'`), n)
})
