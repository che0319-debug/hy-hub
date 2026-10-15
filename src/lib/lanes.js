// Stored executor codes determine the authorized execution channel.
export const LANE_LABELS = {
  GPT_CHAT: 'GPT Chat 對話通道',
  CHATGPT_WORK: 'Claude 工具通道',
  CODEX: 'Claude 程式通道',
  CLAUDE_REVIEW: 'Claude 獨立審查',
}
export const laneLabel = code => LANE_LABELS[code] || code
