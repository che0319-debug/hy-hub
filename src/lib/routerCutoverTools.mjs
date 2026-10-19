// Owner-session management tools. No credentials or arbitrary HTTP surface.
export function registerRouterCutoverTools(modelContext, request) {
  if (!modelContext?.registerTool) return () => {}
  const controller = new AbortController()
  let manifest = null
  let busy = false
  const run = fn => async (input = {}, context = {}) => {
    if (controller.signal.aborted) throw new Error('ROUTER_CUTOVER_TOOLS_CLOSED')
    if (busy) throw new Error('ROUTER_CUTOVER_BUSY')
    busy = true
    try {
      const signal = context.signal ? AbortSignal.any([context.signal, controller.signal]) : controller.signal
      const result = await fn(input, signal)
      return JSON.stringify(result)
    } finally { busy = false }
  }
  const tools = [
    {
      name: 'hy_router_cutover_preview',
      description: 'Owner-only Router migration preview. Read eligible projects, exact package manifest and blockers. Does not migrate or claim work.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: run(async (_, signal) => {
        manifest = null
        const report = await request('/cutover/preview', { signal })
        if (!Array.isArray(report.expected_projects)) throw new Error('ROUTER_CUTOVER_MANIFEST_MISSING')
        if (!controller.signal.aborted) manifest = JSON.parse(JSON.stringify(report.expected_projects))
        return report
      }),
    },
    {
      name: 'hy_router_cutover_apply',
      description: 'Owner-only Router migration and permanent Router-only finalization, using exactly the last preview in this page session. Requires explicit user authorization; preserves completed results. Server rejects stale manifests, live execution locks and unauthorized sessions. Read preview again after applying to verify.',
      inputSchema: {
        type: 'object', additionalProperties: false,
        properties: { confirmed: { type: 'boolean', const: true }, authority_ref: { type: 'string', minLength: 1 } },
        required: ['confirmed', 'authority_ref'],
      },
      annotations: { readOnlyHint: false, consequentialHint: true },
      execute: run(async (input, signal) => {
        if (input.confirmed !== true || typeof input.authority_ref !== 'string' || !input.authority_ref.trim()) throw new Error('ROUTER_MIGRATION_OWNER_CONFIRMATION_REQUIRED')
        if (!manifest) throw new Error('ROUTER_CUTOVER_PREVIEW_REQUIRED')
        const expected_projects = manifest
        // A failed or cancelled write needs a fresh preview; never auto-retry it.
        manifest = null
        return request('/cutover/apply', { method: 'POST', signal, body: {
          confirmed: true, authority_ref: input.authority_ref.trim(), expected_projects,
        } })
      }),
    },
  ]
  try {
    const pending = tools.map(tool => modelContext.registerTool(tool, { signal: controller.signal }))
    Promise.all(pending).catch(() => { controller.abort(); manifest = null })
  } catch { controller.abort(); manifest = null }
  return () => { manifest = null; controller.abort() }
}
