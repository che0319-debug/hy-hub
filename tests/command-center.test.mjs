// CI 入口（過渡）：.github/workflows/pr-preview.yml 仍固定執行 `node --test tests/command-center.test.mjs`，
// 但舊 Command Center 測試已在 bd61822 隨功能退役刪除，導致所有 PR 的 build 失敗。
// 在 workflow 改成 `node --test tests/*.test.mjs` 之前，這個檔案匯入現有的單元測試，讓 CI 實際跑到它們。
// workflow 修好後即可刪除本檔。
import './review-deliverables.test.mjs'
import './sam-business-board.test.mjs'
import './memory-freshness.test.mjs'
