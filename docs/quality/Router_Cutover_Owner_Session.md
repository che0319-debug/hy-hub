# Router cutover through an authenticated owner session

The backend cutover endpoints require the normal owner access token. Producer
MCP credentials cannot invoke them. A logged-in browser previously had no
operation that could call these endpoints without extracting its credentials.

This change registers two narrowly scoped WebMCP tools on the existing
`#/expert-team?tab=models&owner-cutover=1` route, behind AuthGate. It adds no
page, buttons, automatic migration, or alternate authentication mechanism.
Normal visits do not register these tools. Unsupported browsers keep working.

- `hy_router_cutover_preview` reads `/router/cutover/preview` and stores only
  its exact `expected_projects` manifest in page memory.
- `hy_router_cutover_apply` requires `confirmed: true` and an owner authority
  reference. It submits that exact manifest once through the existing
  `routerRequest` owner session. A failed write requires another preview.
- The backend still enforces owner authorization, Router mode, no live leases,
  exact manifest checks, atomic aggregate CAS, and permanent finalization.
- Leaving the route, removing the maintenance parameter, or losing the logged-in
  session unmounts registration, aborts pending requests, and clears the manifest.
- The tools never accept a URL, token, runner identity, project override or
  arbitrary request body. They never return credentials or change auth settings.

Release and execution: verify CI, merge/deploy, pause executors, refresh the
already logged-in browser on the maintenance route, inspect preview and blockers,
apply only under the user's explicit migration authorization, then read preview
again. Report actual `finalized`, eligible and blocked counts. Resume the Router
executor schedule after verification; deployment alone is not migration success.

Validation: `node --test tests/*.test.mjs` (95 passed), `npm run build`.
Tests cover explicit authorization, preview-required writes, frozen manifests,
server errors without retries, concurrent requests, cancellation and cleanup,
and unsupported registration.
