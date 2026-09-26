# AI Work Test sidebar entry — D3

This isolated branch adds a navigation entry only. No deployment was requested.

After an independently approved Test deployment, configure
`VITE_AI_WORK_TEST_URL=https://<approved-test-origin>/ai-work-test` at build time.
It must have a separate HTTPS origin, exactly `/ai-work-test`, no credentials,
query or fragment. Invalid/missing configuration leaves the entry disabled and
clearly labeled “尚未發布”. The normal AI Work route is unchanged.

The link uses a new tab with `noopener noreferrer`. It never appends or forwards
the HY production token/session. The Test runtime requires its own UI login.
No real Test URL or credentials have been configured in this branch.

Verification: `node --test tests/ai-work-test-link.test.mjs`; Sidebar.jsx parses
with esbuild JSX transformation. Full application build/deployment is not claimed.
The existing deploy workflow runs on master only; this branch is not master.
