# Bot Office: report, meeting, journal

The project screen has three tabs. Report presents the registered HTML document first, preserving its cover, chapter anchors, one-page summary, tables, callouts and expandable appendices. The supplied p003-seven-dimensions-plan.html is the visual reference; its historical execution instructions are not new system requirements. The HTML itself should summarize goal/status/progress/blockers/pending decisions/next step, then explain the full project clearly. Live project fields and milestones are a collapsed supplementary disclosure when HTML exists, open as a fallback otherwise. Existing plan content, artifact links and the Drive folder remain accessible. There is no separate planning or results navigation.

Meeting keeps human decisions and reference uploads, plus suggestions/requests from HY or Bots. Ordinary messages are not approvals. It describes GPT as the main executor and the responsible Bot as project lead; fixed executor/backup settings and reassignment controls are no longer shown. Existing data fields and pending requests remain intact.

Formal-history disclosure reads exact registered submission snapshots. The backend PR adds the optional `snapshot` query on the existing project drive-document endpoint. Deploy backend before frontend when HY authorizes rollout. A missing snapshot remains explicitly unavailable.

HTML continues to render in a sandbox without scripts or same-origin access. Project changes refresh report metadata. Existing domain Bot configuration, schedules and GPT calls are unchanged.

Full reading uses the viewport and retains document-native chapter navigation and details controls. The fixed reader base keeps chapter fragments inside srcdoc instead of navigating to the host app. The toolbar exits full reading; Escape also exits while focus is on Office controls (iframe key events cannot cross the sandbox). UTF-8 and viewport metadata are allowed by the paired backend change. Scripted print buttons are excluded from the safe preview; the user's original file is unchanged. The reference document is used only in local isolated checks, not copied into the repository or installed as a live report.

Validation: npm test; npm run build. Responsive isolated browser checks use p-002 and p-003 content at widths 1280 and 390, with all API writes blocked. Screenshots are preview evidence, not production reruns. Formal project replacement and old-project deletion remain deferred until authorized deployment and successful end-to-end verification.
