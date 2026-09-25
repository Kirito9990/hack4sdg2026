# CareCall working memory and change log

Read this file before changing CareCall. Append one entry after each run; preserve earlier entries.

## User constraints (current)

- Work on local `codex/CareCall` only. Never modify, pull or push the teammate's `cursor/neighbourhood-mutual-aid-506d` branch.
- Push only when explicitly requested for deployment or rollback. Rollback of 36b1043 was completed previously; all current refinements stay local for review.
- Preserve the original cream/brown palette from 8845650. Do not change the overall color scheme without asking. Emergency priority colors are intentional.
- English / 繁體中文 / 简体中文 throughout.
- Request submission must remain actionable. Explain missing location and offer explicit GPS permission request plus manual map selection.
- A visible + attachment control must open the photo picker.
- Resident voice input: microphone, tap to start/stop. No language selector, browser dictation, or speech-consent workflow; language/transcription belongs to the future LLM integration.
- Account button opens a sidebar with vertically arranged account options leading to sections/pages.
- Preserve requested matched chat/photos/calls, resident completion and volunteer shift behavior while correcting the UI.
- Never include .env.local, secrets, or the local test-call destination in Git.
- Test denied/unavailable geolocation and permissions that have not been granted, not only pre-granted browser contexts.

## Known operational facts

- Render: https://carecall-djzc.onrender.com ; dashboard service srv-dar78s0u01pc738fn950.
- Actual Render service auto-deploys pushes to codex/CareCall even though render.yaml says autoDeployTrigger: off (manually created service).
- HTTPS is managed by Render. Local unpushed edits do not update production.
- Current LOCAL code uses single-process SQLite snapshots. Use CARECALL_DB_PATH on a durable disk. Default .carecall-data is ignored; never share or commit it. Render free disk is ephemeral. Online reverted version remains in-memory. No verified phone authentication or account recovery.
- Calls are native tel links, not browser VoIP.
- Local app uses port 47291. Test servers must use separate ports and synthetic users.

## Prior runs (retrospective)

### Initial CareCall implementation — commit 8845650

Branding, OSM/Leaflet, three languages, account/privacy, matching and temporary chat, calls, media preprocessing, optional AI adapters and deployment configuration. Build/lint/API and browser checks passed. Deployed on Render.

### Mobile redesign — commit 36b1043

Added tabbed mobile screens, photo chat, resident completion and volunteer shift. Changed palette without authorization. Disabled submit while GPS was missing and tested only pre-granted GPS. A displayed + was decorative rather than clickable. Voice UI remained too complex. These were mistakes; passing happy-path tests did not establish usability.

### 2026-09-25 — rollback and local corrections

- User requested reversal plus six concrete usability fixes.
- Pushed non-destructive revert cf9fe00 to codex/CareCall; previous 8845650 behavior restored in Git.
- Preserved the refinement patch outside the repo, then reapplied it locally for targeted correction. No corrected feature code pushed.
- Online rollback independently verified: HTTP 200, previous login layout restored, emergency link remains tel:999.

Additional user corrections this run: simplify login; phone examples belong in placeholder text; remove local-demo explanatory copy from normal pages; verify emergency 999 separately from the matched resident test call. Verified local .env has only matched-call override; emergency override is unset, so 999 remains tel:999. No real phone calls were placed.

### Completed local corrections and validation

- Original cream/dark palette restored. Kept requested priority colors and semantic call/status colors.
- Send is enabled before GPS is available; it explicitly requests location and explains denial/failure. Drafts survive the map tab. Pending permission requests can be resolved by manual map selection and have a bounded wait. No location is invented or silently submitted.
- Map is visible before GPS consent. Users can tap a point, or enter coordinates if tiles/network fail.
- + opens the photo file chooser; microphone is tap-to-start/stop with a preview and removal. No language selector or browser dictation.
- Account opens a native modal sidebar with keyboard focus handling and vertical links to dedicated account pages.
- Login reduced to basic fields, role and continue; phone placeholder example; expandable usage/privacy notes. Removed local-demo notes from normal pages.
- Build, TypeScript and ESLint passed. Ten API checks and one comprehensive dual-user browser test passed (11 reported tests). Browser checks cover denied/unavailable/pending GPS, manual fallback, photo selection, fake microphone recording, drafts, sidebar, completion, three languages, 360/390px widths and tel targets.
- Real OSM tiles: first check was blocked by sandbox networking (ERR_NETWORK_ACCESS_DENIED); repeated with permitted network access and four real tiles loaded successfully. Do not confuse sandbox failures or gray loading placeholders with a validated map.
- Screenshots saved in the parent GenAI folder: carecall-login-corrected.png, carecall-map-corrected.png, carecall-sidebar-corrected.png.
- Only cf9fe00 (rollback) was pushed this run. All corrected UI/features, test additions and this log remain local and uncommitted. Do not redeploy until requested.


### 2026-09-25 — location consent, history and account privacy

- Removed coordinate entry/display; kept GPS and map pin selection. Signup requests permission, remembers denial/grant, and saves account preference. Browser permissions remain revocable. Three-line optional resident address added.
- Login now requires a checkbox with linked privacy dialog; placeholder is invalid 0000 0000. Added name/address/location sharing preferences in all three languages. Original palette preserved.
- Replaced main Map tab with History; task-specific route maps remain. Accepted assignments lock shift switching in UI and API.
- Completion blocks further text/photos/calls. Chat remains read-only for 7 days from completion, then ordinary UI/APIs hide it. Database archive persists until deletion; account centre can delete completed shared history. Indefinite archival is disclosed in the privacy dialog; production should define a retention policy.
- Added SQLite snapshot persistence, Node >=22.13, ignored DB paths and Docker writable data directory. Single-process only; Render free storage is not durable. Existing deployed version was not changed. No real phone calls; phone control displays current shared number and opens the device dialer, with copy-number fallback. Browser-to-PSTN calling still needs a provider.
- Validation: build/typecheck/lint and API/mobile/persistence regression suites. Tested denial/unavailable/pending GPS, manual map, photos/recording, shift lock, completion read-only, 7-day boundary, archive API exclusion, database archive deletion and persistence across fresh processes. No pushes/pulls/commits this run.

### 2026-09-25 — authorized CareCall deployment and teammate comparison

- User authorized committing/pushing current refinements to codex/CareCall and refreshing Render HTTPS. Only that branch is a write target.
- Remote cursor branch verified read-only at 14aa2d1015c406da0dbca0351c38f9d04b70f2f2, matching local object; no checkout, pull, fetch, merge or push to that branch.
- README now credits inherited functionality and documents exact-baseline improvements and remaining limits. Saved the baseline README verbatim to docs/TEAMMATE_README.md.
- Excluded local env, secrets, test destination and SQLite data from publication. Prior build/lint and 13 local regression checks passed; deployment verification follows the push.
