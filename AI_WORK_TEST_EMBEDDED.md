# In-app Test login integration — 2026-09-27
## Scope and architecture
User approved sharing the existing backend process. The existing HY Life OS internal Test route is retained.
Verified frontend hosting: .github/workflows/deploy.yml builds GitHub Pages on master. It provides no same-origin reverse proxy, so this implementation uses an explicitly allowed cross-origin iframe instead of assuming a proxy exists.
Only the configured exact HTTPS parent origin may embed the Test backend. The frame sandbox allows forms and same-origin identity; scripts, top navigation, and popups are not allowed.
Existing native forms submit to the Test backend. No parent-page approval API, localStorage workflow, postMessage credential transport, or production work store is introduced.
Embedded mode uses Secure, HttpOnly, SameSite=None, Partitioned cookies scoped to /ai-work-v3-test/. The parent cannot read these cross-origin cookies or form contents. Direct standalone mode retains Strict cookies and frame-ancestors none.
The iframe form origin must match the configured backend origin. Fetch metadata must be navigation/iframe in embedded mode; cross-site fetch metadata is permitted only because a cross-site ancestor can affect it. Formal session, CSRF, intent, authorization and CAS checks remain mandatory. Wrong origins and fetch/XHR-style requests are rejected.
Delegated Grok account uses the same formal frontend action as HY. No person-only approval restriction.
Reload restores an existing valid Test session; expired/revoked sessions are cleared and redirected to Test login. No action is inferred from logging in or reloading.
Embedded CSS removes the duplicate sidebar. Full six-reference visual acceptance is not claimed.

## Configuration contract — not installed
Backend environment (existing host, no new service):
- AI_WORK_V3_TEST_ENABLED=1
- AI_WORK_V3_TEST_ORIGIN: exact existing backend HTTPS origin, no path
- AI_WORK_V3_TEST_FRAME_PARENT: exact HY Life OS frontend HTTPS origin, no path/wildcard
- AI_WORK_V3_TEST_GITHUB_TOKEN: user-held dedicated token, entered only via host masked secret settings
Frontend public build variables (not secrets):
- VITE_AI_WORK_TEST_ENABLED=1
- VITE_AI_WORK_TEST_BASE: exact backend HTTPS origin
Absent or invalid frontend settings preserve the honest disconnected screen and create no iframe. Backend remains disabled unless explicitly configured. Build workflow now references these public variables but no repository settings were changed.
The token must never enter frontend VITE variables, chat, source, screenshots or logs.

## Evidence
161 Python tests passed against pinned FastAPI 0.115.0/httpx 0.28.1. Count includes inherited/repeated base tests documented in SHARED_HOST_CHECKPOINT.md.
6 embedded browser scenarios passed using actual AIWorkTest React component, real cross-site TLS iframe/native forms, synthetic delegated account and simulated CAS storage:
login, nonempty partitioned secure session cookie, one accepted formal approval and one revision increase, outer tab preserved, session restored without repeated approval, disallowed ancestor blocked.
5 existing in-app navigation checks passed; production pages and AuthGate mocked in that fixture.
Wrong-origin requests, non-navigation API requests, invalid parent configuration and expired sessions are tested.
Cookie design reference: https://privacysandbox.google.com/cookies/chips (partitioned cookies keyed by top-level site). Browser support must still be verified on the user's target browsers; a local Chromium pass does not establish Android WebView/Safari coverage.

## Remaining gates / deployment status
Not deployed, no token injected, no real account enrollment, no changes to main/master or production settings.
Real GitHub CAS browser workflow acceptance is still pending. Browser tests use simulated storage.
Full production AuthGate/service graph and actual legacy MCP Test-ID rejection remain pending, as do remote Executor lifecycle and account provisioning.
The empty remote Test seed still contains no accounts or work.
SHARED_HOST_CHECKPOINT.md statements that embedding/session integration is unresolved are superseded by this source-level checkpoint, not by a live-deployment claim.
No paid service, Telegram outbound, scheduler/Go Job restoration or production cutover authorized or performed.
