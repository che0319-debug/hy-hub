# Bot Office: report, meeting, journal

The project screen has three tabs. Report shows live goal/status/progress/blockers/pending decisions/next step and the registered HTML body. Existing plan content remains a fallback while no HTML report exists; artifact links and the Drive folder remain accessible. There is no separate planning or results navigation.

Meeting keeps human decisions and reference uploads, plus suggestions/requests from HY or Bots. Ordinary messages are not approvals. It describes GPT as the main executor and the responsible Bot as project lead; fixed executor/backup settings and reassignment controls are no longer shown. Existing data fields and pending requests remain intact.

Formal-history disclosure reads exact registered submission snapshots. The backend PR adds the optional `snapshot` query on the existing project drive-document endpoint. Deploy backend before frontend when HY authorizes rollout. A missing snapshot remains explicitly unavailable.

HTML continues to render in a sandbox without scripts or same-origin access. Project changes refresh report metadata. Existing domain Bot configuration, schedules and GPT calls are unchanged.

Validation: npm test; npm run build. Responsive isolated browser checks use p-002 and p-003 content at widths 1280 and 390, with all API writes blocked. Screenshots are preview evidence, not production reruns. Formal project replacement and old-project deletion remain deferred until authorized deployment and successful end-to-end verification.
