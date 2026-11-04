// 全系統預設 AI（主案／備案）。巡視改用備案時每次通知使用者（巡視不在本 repo）。
export const OFFICE_AI_CHOICES = ['grok-build', 'gpt', 'claude']

export const OFFICE_AI_DEFAULTS = {
  executor: { primary: 'grok-build', backup: 'claude' },
  reviewer: { primary: 'gpt', backup: 'claude' },
}

const named = value => (typeof value === 'string' && value.trim() && value !== '尚未指定') ? value.trim() : ''
const pickAi = (value, fallback) => OFFICE_AI_CHOICES.includes(value) ? value : fallback

export function parseOfficeSettings(payload) {
  const raw = payload?.ai_defaults || payload?.settings?.ai_defaults || payload || {}
  const revision = [raw.revision, payload?.revision, payload?.settings?.revision].find(Number.isInteger) ?? 0
  return {
    revision,
    updated_at: raw.updated_at || payload?.updated_at || null,
    updated_by: raw.updated_by || payload?.updated_by || null,
    ai_defaults: {
      executor: {
        primary: pickAi(raw.executor?.primary, OFFICE_AI_DEFAULTS.executor.primary),
        backup: pickAi(raw.executor?.backup, OFFICE_AI_DEFAULTS.executor.backup),
      },
      reviewer: {
        primary: pickAi(raw.reviewer?.primary, OFFICE_AI_DEFAULTS.reviewer.primary),
        backup: pickAi(raw.reviewer?.backup, OFFICE_AI_DEFAULTS.reviewer.backup),
      },
    },
  }
}

export function officeAiConflict(defaults) {
  const executor = defaults?.executor || {}
  const reviewer = defaults?.reviewer || {}
  const messages = []
  if (executor.primary && reviewer.primary && executor.primary === reviewer.primary) messages.push('執行與審查主案必須不同')
  if (executor.primary && executor.backup && executor.primary === executor.backup) messages.push('備案必須與同一角色的主案不同')
  else if (reviewer.primary && reviewer.backup && reviewer.primary === reviewer.backup) messages.push('備案必須與同一角色的主案不同')
  return messages
}

// 專案沒寫備案時才用預設。主案若剛好等於該角色的預設備案（例如審查者是 Claude），
// 改派表單不能帶著衝突打開，否則只填說明也送不出去。已寫在專案上的備案保持原樣。
function backupFor(explicit, primary, roleDefaults) {
  if (explicit) return explicit
  const preferred = [roleDefaults?.backup, roleDefaults?.primary, ...OFFICE_AI_CHOICES]
  return preferred.find(id => OFFICE_AI_CHOICES.includes(id) && id !== primary) || ''
}

export function seedOfficeAi(settings, project) {
  const defaults = parseOfficeSettings({ ai_defaults: settings?.ai_defaults || settings }).ai_defaults
  const executor = named(project?.executor) || defaults.executor.primary
  const reviewer = named(project?.reviewer) || defaults.reviewer.primary
  return {
    executor,
    reviewer,
    executor_backup: backupFor(named(project?.executorBackup), executor, defaults.executor),
    reviewer_backup: backupFor(named(project?.reviewerBackup), reviewer, defaults.reviewer),
  }
}
