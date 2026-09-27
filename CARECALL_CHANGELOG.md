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
- Deployment result: f35842caa4d1f7f78b8136a222a91752b5323dc1 pushed only to codex/CareCall. Render auto-deployed; public HTTPS login returned 200 with the new privacy checkbox and invalid phone placeholder. Temporary production account creation, profile persistence/read-back and deletion all succeeded; no requests or calls were created. Remote cursor hash remained 14aa2d1015c406da0dbca0351c38f9d04b70f2f2. This post-deployment verification note is kept locally to avoid another code deployment solely for a log update.

### 2026-09-27 — local workspace cleanup

- Read-only GitHub check confirmed codex/CareCall at f35842caa4d1f7f78b8136a222a91752b5323dc1, matching local HEAD. Application source matched; this log already had an uncommitted deployment verification note. Ignored environment, SQLite and build files remain local.
- Kept hack4sdg2026 as the working directory. Moved three current regression screenshots from GenAI root into local-artifacts/hack4sdg2026_codex-CareCall_20260927151156/screenshots and verified SHA-256 hashes.
- Removed eleven superseded screenshots, the obsolete deployment ZIP and the duplicate refinement patch. The patch's stable patch-id exactly matched commit 36b1043; its changes remain recoverable from Git history.
- Saved an action/hash manifest and checklist locally. Ignored local-artifacts through .git/info/exclude. Preserved application source, local configuration/database files, the earlier CareCall/UI prototype and unrelated project directories. No commit, push or deployment was performed.

### 2026-09-27 — full working folder and remote branch backups

- Created two ZIPs in ../Backups/hack4sdg2026_codex-CareCall_20260927152240, captured at 15:22:40 UTC+08:00. Working-folder ZIP includes all 25,343 files, ignored/private configuration, dependencies, build output, local artifacts and .git. Added two integrity-checked SQLite backup-API snapshots for reliable database recovery.
- Read-only remote verification matched local codex/CareCall at f35842caa4d1f7f78b8136a222a91752b5323dc1. Separate branch ZIP includes its 75 raw Git blob files plus a verified Git bundle of the branch and its reachable history.
- Both ZIPs passed complete CRC checks; branch contents matched Git object hashes. Working-folder capture recorded per-file SHA-256 and confirmed source sizes/mtimes remained stable. Archive SHA-256 checksums, metadata and recovery instructions accompany the backups.
- This completion note was added after the point-in-time backup. No application code, remote refs or deployment changed.

### 2026-09-27 — volunteer walking/transit handoff and live foreground location

- Implemented locally on codex/CareCall. Replaced the volunteer's static driving-route control with Public transport / Walk / Drive, remembered mode/provider, and Google Maps, Apple Maps, 高德地图 and 百度地图 links. Directions and the destination remain available without a saved volunteer position or GPS permission. No API keys or dependencies added.
- Used documented WGS84 provider parameters, native Amap/Baidu route links, and explicitly labeled HTTPS destination fallbacks. External links omit resident names, address text, phones, request IDs and conversations. Details and limitations are in docs/NAVIGATION.md.
- Added opt-in foreground watchPosition, a moving marker, accuracy circle, follow/pan control, update time, low-accuracy/stale/error states and a bounded pending-permission message. Tracking pauses in background and requires a new fix on return; it stops on map-tab exit, completion, denial, or manual stop. Live fixes remain in component memory. No external journey progress is claimed.
- Preserved original palette and all three languages. Fixed map cleanup during language changes while tracking. Kept the old driving endpoint for compatibility; the navigation UI no longer calls it.
- Validation: production build (including TypeScript), full ESLint, four link/platform/privacy tests, live-map browser regression and existing request/chat/call UI regression passed (6 tests total). Browser checks covered moving/stale/inaccurate readings, denied/unavailable/pending GPS, background/resume, tab exit, completion, saved preferences, 360/390px layouts and language switching. Real OSM tiles loaded; reviewed screenshots in local-artifacts/navigation-20260927. Synthetic accounts were deleted after checks; tests used isolated navigation-test.sqlite on port 47295.
- Initial build font fetching required network access; it succeeded on retry. Native phone-app launches and exact Hong Kong route availability remain physical-device smoke checks. No commits, pushes or deployment.

### 2026-09-27 — simplified navigation and animated map-app bottom sheet

- User deferred in-web route planning/API credentials and required a bottom-sheet chooser with installed-app and app-store paths. Replaced the travel-mode/provider form with a destination map and persistent Start navigation / 開始導航 / 开始导航 button. Priority details remain in other task tabs, giving the map more space. No full-screen map was introduced.
- Added an animated, accessible dialog bottom sheet: slide-up/down, fading backdrop, reduced-motion support, keyboard focus containment, focus restoration, Cancel/Escape/outside-tap dismissal. All text is translated in English/Traditional/Simplified Chinese.
- iOS/iPadOS shows Apple Maps, Google Maps, 高德地图 and 百度地图, each with Open and direct App Store Install links. A website cannot reliably detect arbitrary installed iOS apps; there are no fabricated installed indicators or timer-based store redirects. Android shows Google/高德/百度 with explicit package intents and browser_fallback_url store destinations (Google Play / 应用宝), plus direct Install links for unsupported browsers. Desktop shows store choices. Coordinates are never passed to store listings.
- Retained opt-in live foreground tracking and coordinate/privacy protections. No in-web travel plans or routing API calls; external apps handle mode choice and navigation. Updated docs/NAVIGATION.md with platform limits and verified documentation sources.
- Validation: production build/TypeScript, full ESLint and git diff --check passed. Seven link/platform/store tests, updated navigation UI regression and existing request/chat/call UI regression passed (9 tests total). UI checks covered focus trapping, close/reopen, outside tap, Escape, reduced motion, iOS and Android link inspection, pending/denied/unavailable/stale GPS, language switches, task completion with sheet open, and 360px phone fit. Real OSM tiles loaded. Reviewed settled screenshots in local-artifacts/navigation-sheet-20260927. Synthetic accounts were deleted and the isolated test server stopped.
- Physical installed-app launches and store handoff remain phone smoke checks; no actual external app or store was launched by the browser tests. No commits, pushes, deployments or new credentials.

### 2026-09-27 — localized map names and single-tap app/store handoff

- Replaced the mobile Open/Install choice with one full-row action per map app. Names follow the selected UI language: AMap / Baidu Maps, 高德地圖 / 百度地圖, 高德地图 / 百度地图. Apple and Google names are translated too. Preserved the animated bottom sheet and desktop store links.
- Mobile clicks attempt the native app first. Android intents retain direct package/store fallback; iOS uses native schemes with a guarded 2.5-second foreground store fallback. Apple chooser uses maps: so an HTTPS web map does not replace this handoff. Google uses App Store / Google Play; AMap and Baidu use App Store / 应用宝. No coordinates go to store listings.
- Hidden/pagehide permanently cancels fallback. System-prompt blur pauses it, with a fresh grace period on focus within 15 seconds. Late timers, dismissal, another app selection, destination changes and component cleanup cancel stale attempts. This remains a browser heuristic, not reliable iOS installation detection; system prompts, slow launches and embedded-browser restrictions require phone verification. docs/NAVIGATION.md describes these limits.
- Validation: production build and TypeScript, ESLint, git diff --check, twelve link/handoff unit checks, navigation browser regression and existing request/chat/call regression all passed (14 tests). Browser tests verify three-language names, one link per app, Android intent fallbacks, cancelled/changed handoffs, and locally intercepted App Store navigation. Native links were prevented and no real store/app was opened. Real OSM tiles loaded and the 360px bottom sheet screenshot was reviewed in local-artifacts/navigation-handoff-20260927.
- Synthetic accounts were deleted; isolated test server stopped. Changes remain local and uncommitted; no push or deployment.

### 2026-09-27 — authorized navigation deployment

- User authorized deploying this navigation update through the previous GitHub/Render flow, with codex/CareCall as the only push target. Confirmed the earlier deployment in the Check GitHub sync access task and this repository's deployment files. Existing remote codex/CareCall matched local baseline f35842c; no other branch or repository was fetched, pulled or changed.
- Publishing the tested navigation implementation, translations, documentation and regression tests. README now describes the current live map and external-map chooser instead of the old embedded driving-route control. Local configuration, databases, dependencies, backups and screenshots are excluded.
- Pre-deployment build/typecheck, ESLint and 14 link/handoff/browser checks passed in this task. Existing HTTPS login, volunteer page and health endpoint returned 200 before the update. Render uses the same service and HTTPS address; deployment verification will follow the explicit branch-only push.
