// Lane codes stay for data compatibility; every lane is now executed by Claude.
// Which AI actually serves a lane is decided by the schedule that polls it.
export const LANE_LABELS = {
  GPT_CHAT: 'Claude 對話通道',
  CHATGPT_WORK: 'Claude 工具通道',
  CODEX: 'Claude 程式通道',
  CLAUDE_REVIEW: 'Claude 獨立審查',
}
export const laneLabel = code => LANE_LABELS[code] || code
