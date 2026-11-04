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

export function seedOfficeAi(settings, project) {
  const defaults = parseOfficeSettings({ ai_defaults: settings?.ai_defaults || settings }).ai_defaults
  return {
    executor: named(project?.executor) || defaults.executor.primary,
    reviewer: named(project?.reviewer) || defaults.reviewer.primary,
    executor_backup: named(project?.executorBackup) || defaults.executor.backup,
    reviewer_backup: named(project?.reviewerBackup) || defaults.reviewer.backup,
  }
}
