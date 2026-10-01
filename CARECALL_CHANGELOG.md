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
- Photos are attachments only, viewable by the matched volunteer; never send pictures to AI/OCR. Require nonblank text or a nonempty voice recording before submission in both UI and API (1 October clarification).
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
- Deployment completed: 327ffadaaa73aedf9d54947a163e9f35111df16d pushed explicitly as HEAD:refs/heads/codex/CareCall with tag following disabled. Remote branch read-back matched. No fetch/pull, other branch writes or other repository writes were performed.
- Render auto-deployed at https://carecall-djzc.onrender.com. Health and volunteer HTML returned 200; all 12 referenced JavaScript assets loaded and contained the new chooser, three-language names, native app schemes and store fallback. A read-only mobile browser smoke test passed for English/Traditional/Simplified login, privacy checkbox, phone placeholder, no horizontal overflow and no page errors. Production API writes were blocked during this check; no test accounts, requests, phone calls or native app launches were created online.
- This post-deployment verification note stays local to avoid triggering another deployment solely for the log. Phone-native handoff behavior still needs the physical-device checks already documented.

### 2026-09-27 — location permission recovery after Safari settings changes

- User reported iPhone Safari showing blocked location when going on shift and on every Use my location retry. Verified the deployed HTTPS response has no Permissions-Policy/Feature-Policy location restriction. Fresh retries already called geolocation, so the user's specific failure may still be an iOS/device-level denial; advised checking Location Services → Safari Websites and Safari's per-site setting. No physical iPhone diagnosis is claimed.
- Fixed a separate confirmed application bug: removed stored blocked flags from signup and request submission gates and from initial error display. Old browser data no longer fabricates a current denial. Removed automatic account-consent writes from permission queries and GPS failures; browser permission and explicit account preference remain separate. Explicit successful GPS requests can enable the preference as before. Browser denial still clears the cached position, and manual pin selection remains available.
- Ignored geolocation callbacks after their request settled/timed out. Updated all three denied-location messages to mention device Location Services and site permission. Updated README with recovery guidance.
- Validation: production build/TypeScript and ESLint passed. Focused location-recovery browser test covers volunteer shift, old saved denial, actual denied request followed by success, conflicting query state, unsupported/missing Permissions API, signup and Send recovery, and ignored late callbacks. Existing navigation and request/chat/call regressions passed. Initial focused test waited for a resident-only label on the volunteer screen; corrected it to verify the successful nearby-task query and map-picker dismissal, then it passed. All accounts were synthetic on an isolated local test database.
- Continuing the authorized deployment correction on codex/CareCall only; no other branches or repositories are write/pull targets. Deployment verification follows.
- Deployed 04f77c10b8e9051e0730a0abc7095e97e24afcc0 by explicit HEAD:refs/heads/codex/CareCall push, without tag following or any pull/fetch. Render health returned 200; login and volunteer pages plus all referenced assets returned 200 and included the new guidance with no legacy carecall_location_choice gate. Isolated browser-test accounts were deleted and the test server stopped. This verification note remains local. The user's iPhone-level permission issue cannot be confirmed resolved until a fresh phone retry.

### 2026-09-27 — independent history, larger chat and role-specific privacy

- User confirmed location and map handoff now work, and requested improvements to history, chat space and role-specific privacy. History rows now open an internal Summary/Conversation view with Back to history, preserving the selected History tab. Completed chat remains read-only and subject to both parties' chat consent and seven-day visibility.
- Closed-request APIs now omit names/contact fields, addresses, exact coordinates and photos, and redact known profile names/addresses plus phone patterns from summaries, transcripts and chat text. Photos get a hidden-photo placeholder. Original records remain stored under the existing retention/deletion policy; arbitrary personal details in free text cannot be fully detected. No claim that already viewed/saved copies can be recalled.
- Removed the resident-oriented acceptance banner from the volunteer workspace. Moved the full priority card into Details and removed the chat privacy disclosure, photo notice and redundant completion reminder from the active conversation. Moved the relevant disclosures into the linked login/account privacy notice. Active volunteer message area exceeds 280px at 360×740.
- Removed Details expanders from all privacy controls. Resident-only address sharing is hidden for volunteers and role-enforced server-side. Added volunteer-only live location sharing, off by default. It requests location permission and shares only with the matched resident during an active request while the volunteer page is visible. Resident Map tab displays a recent point with update time/accuracy.
- Shared positions are one-point, in-memory server state, never SQLite/history/public task lists. Uploads use fresh fixes at most every ten seconds; points expire within sixty seconds. Consent/device-location opt-out, request completion and account deletion clear points. Background/unmount queues removal after outstanding uploads; server expiry covers failed cleanup. API checks enforce role, membership, consent, request status, coordinates, sample freshness and same-origin writes.
- Validation: build/TypeScript, ESLint and diff checks passed. Fifteen API/browser checks plus three persistence/retention checks passed; focused sharing tests reran after adding device-location revocation cleanup. Covered history navigation and redaction, readonly actions, role-specific controls, disclosure relocation, sharing opt-in/background/off/completion, authorization failures and small-screen layout. Reviewed chat/privacy/history screenshots in local-artifacts/history-chat-20260927. Synthetic test accounts were deleted and isolated servers stopped.
- Publishing through the existing authorized codex/CareCall → Render flow only. Remote baseline verified at 04f77c1. No other repository/branch modification or pull/fetch; private data/configuration and local screenshots remain excluded. Deployment verification follows.
- Deployed bd02b5aea63c9b1a4402da80a492e1df11171c1b by explicit branch-only push with tag following disabled; remote read-back matched. Render health/page/all twelve referenced JS assets returned 200 with the new history/sharing code; the new location route is present and rejects unsupported GET (405). Read-only production browser check confirmed the updated login privacy notice and no page errors; production writes were blocked. No real user records, phone calls or native navigation were exercised. This final verification note stays local.

### 2026-09-27 — local-only progress and quieter accepted-request workspace

- User explicitly restricted this session to working-folder changes. No git operations, commits, remote access, branch mutations, push, pull or deployment were performed. The existing deployment remains unchanged.
- Changed accepted-request tabs to Conversation / Progress / Map in English, Traditional Chinese and Simplified Chinese. A compact animated connection and Help in progress status stay directly in the conversation/map workspace; tapping opens the in-page Progress tab. The progress view links volunteer/resident visually and shows actual requested, matched and completion timestamps. Animation represents ongoing assistance, not GPS distance, ETA, departure or arrival. It stops in completed views and respects reduced-motion preferences.
- Removed the permanent resident acceptance banner. Both roles receive a role-appropriate, dismissible five-second notification for a fresh acceptance. Session-only request identifiers prevent replay after tab changes or refresh; restored old tasks do not notify. No contact/location information is stored for notification deduplication.
- Visually hid the redundant active-task heading/locked shift control, removed the chat subtitle and backend input-processing disclosure, and eliminated duplicate summary text. Kept the request summary, priority, shared address and photos in Progress, with emergency calling and resident completion controls preserved. The active volunteer chat log remains over 280px high at 360×740.
- Validation: final production build/TypeScript and ESLint passed. History/chat/privacy/location-sharing, request/call/recording, navigation lifecycle/chooser, and new progress/notification browser tests passed using synthetic accounts on an isolated local database. The new test verifies one-time notices, role-specific text, three tabs, completion timestamps, animation/reduced motion, multilingual sizing and chat room. All test accounts were deleted and the local test server stopped.
- Initial navigation screenshot capture timed out waiting for external map tiles; the functional suite passed on rerun without optional external-tile screenshots. The initial new progress test attempted to open Progress after completion had returned the restored volunteer page to Nearby; corrected the test to reopen Requests, then it passed. Reviewed local screenshots in local-artifacts/progress-20260927, including volunteer-conversation.png, acceptance-toast.png and volunteer-progress-zh-Hans.png. No physical iPhone test is claimed.

### 2026-09-27 — account icon and authorized progress deployment

- User authorized publishing the local progress improvements and requested a clearer person icon for Account centre. Replaced the small circular glyph/text button with a 24px SVG head-and-shoulders outline in a 44px button. The localized accessible name and tooltip remain, and the existing account drawer behavior is unchanged.
- Production build/TypeScript, ESLint and diff checks passed. Re-ran the progress/notification, history/chat/sharing, navigation lifecycle and request/call/account-drawer browser suites: all four passed on an isolated local database. Reviewed the 360×740 conversation screenshot with the new icon in local-artifacts/progress-deploy-20260927. Synthetic test accounts were deleted.
- Confirmed local and remote codex/CareCall both start at bd02b5aea63c9b1a4402da80a492e1df11171c1b. Only this branch is authorized for the commit and explicit push; no fetch/pull, other branch writes or other repository writes. Existing GitHub-to-Render deployment will be verified after publishing. Private configuration, databases and screenshots remain excluded.
- Deployed e2eb0a41aec3fbb7551aa60a6e06ea6e913b2896 through explicit HEAD:refs/heads/codex/CareCall push with tag following/mirror disabled; remote read-back matched. Render health, volunteer page and all twelve referenced JS assets returned 200, with the new progress, transient notice and person-icon markers present. Read-only production browser checks passed in English/Traditional/Simplified Chinese: 44px icon touch target, working account drawer, no horizontal overflow and no page errors. No production account/data writes, phone calls or native map launches were made. Test server stopped. This final verification note stays local to avoid a second deployment just for the log.


### 2026-09-27 — current branch backup

- Saved local `codex/CareCall` at `e2eb0a41aec3fbb7551aa60a6e06ea6e913b2896` to `../Backups/hack4sdg2026_codex-CareCall_20260927212327`. Verified Git bundle includes reachable history; working-source ZIP includes 94 tracked/non-ignored files and the pre-existing uncommitted changelog. Ignored configuration, databases, dependencies and build output are excluded.
- Git bundle verification, ZIP CRC and per-file SHA-256 comparisons passed; archive checksums and restore instructions accompany the backup. This completion note follows the snapshot. No commit, checkout, push or deployment.


### 2026-09-27 — direct folder backup

- User clarified that the backup should be an ordinary folder directly inside GenAI/Backups. Copied the full project to `../Backups/CareCall_20260927_212559`, including .git and ignored/local files. Checked all 25,619 files by SHA-256; recopied and verified five SQLite shared-memory files changed by snapshot checks. Seven consistent SQLite snapshots passed integrity checks in `_backup_metadata/consistent-databases`.
- This completion note was added after the snapshot. No commit, checkout, push or deployment.

### 2026-10-01 — latest GitHub code and Track 3 interim report

- User requested the most current GitHub code, preservation of unfinished features, and a Word interim report against the organiser's requirements. Fetched only codex/CareCall and fast-forwarded e2eb0a4 to 1162ac59b4c23879094be8ab442b5b1aa9c68d44; preserved pre-existing local changelog edits. The update includes enlarged/fullscreen maps and a sizing fix. No teammate branch checkout/write, push or deployment.
- User corrected the competition track to Track 3, Smart Living, Culture & Belonging, and authorized assigning a team name and roles. Assigned CareConnect Collective with Member A product/evidence, Member B interface/integration and Member C AI/backend. Personal names are not provided. User confirmed no resident/volunteer interviews or external user testing yet.
- Added docs/IMPLEMENTATION_ROADMAP.md as durable project memory. Future work must read it alongside this log. Core unfinished requirements are validated live LLM categorization and urgency assessment, emergency arrangement/human review, and durable production database handling. Existing optional adapters and single-process SQLite are explicitly credited as partial foundations. Preserved coordinator approval, volunteer vetting, verified contact/recovery, proxy intake/read-back, transcript confirmation, scheduling, no-match handling, retry safety, optional SMS and deferred offline/automatic-calling plans from the 24 September plan. Current 5 km matching and HIGH/MEDIUM/LOW labels differ from earlier 500 m/P0-P3 proposals; those changes are not implemented.
- Created ../reports/interim-2026/CareCall_Interim_Report_2026.docx, covering all 23 questions with sources, honest status, proposed milestones and evaluation targets. Eight pages checked visually; Word export substituted for unavailable bundled LibreOffice and the packaged renderer produced inspection PNGs. Removed inherited title border; remaining seven pages were image-identical after the final render. QA intermediates stay in the report's qa folder.
- Current-code verification: ESLint and production build/TypeScript passed. Build initially failed under restricted networking while fetching Google Fonts and passed with allowed network access. Two focused tests passed for cross-process SQLite persistence/deletion and seven-day visibility boundary. Broader prior checks, live AI accuracy, real phone calls and physical-device maps were not rerun or claimed. No report submission occurred.

### 2026-10-01 — speech transcription and photo-to-text extraction

- User confirmed hack4sdg2026 as the working folder and requested the latest GitHub input plus Deepgram/OpenRouter integration. Fetched only codex/CareCall; local and remote still match 1162ac59b4c23879094be8ab442b5b1aa9c68d44. Preserved pre-existing changelog and untracked implementation roadmap. User then deferred deployment and prioritized speech-to-text and picture-to-text; no deployment configuration changes remain, and no commit/push/deployment occurred.
- Retained the existing server-side Deepgram adapter, added optional DEEPGRAM_LANGUAGE (auto by default, zh-HK for a Cantonese-only test), and fixed typed text suppressing audio transcription. Typed text and redacted speech both reach classification; speechTranscript separately records the actual speech result. Failure never labels typed text as successful transcription. Automatic Cantonese detection/code-switching still needs live evaluation; no language selector or browser dictation added.
- Extended OpenRouter from text-only classification to server-validated JPEG input plus text/transcript. Photo requests require structured imageDescription and imageText (empty when nothing safe/legible is read), with type/length validation and provider capability filtering. OPENROUTER_VISION_MODEL can override the main model; Gemini remains optional. Only validated OpenRouter fields are copied to request storage.
- Added translated expandable extraction results in pending requests, progress/details and history, plus honest unavailable messages. Extracted personal details are redacted in participant views and excluded from public nearby listings. Existing palette, consent defaults, matching and emergency actions retained. Updated README and .env.example for local use; real keys/environment files were not changed or printed.
- Validation: 15 mocked adapter/intake/privacy tests, mobile UI extraction/history/failure checks in English/Traditional/Simplified Chinese, ESLint, production build/TypeScript and diff whitespace checks passed. Browser tests intercept API data and use synthetic records; no actual accounts or provider calls. Reviewed 360px screenshot in local-artifacts/ai-extraction-20261001. One rebuild encountered Windows EBUSY while the test server held standalone files; stopping that server resolved it and the final build passed. Test server stopped.
- Neither DEEPGRAM_API_KEY nor OPENROUTER_API_KEY is configured in the local .env.local. Live provider connectivity, real recording/photo accuracy, Cantonese/English performance and emergency classification remain unverified. Add keys privately to the existing ignored environment file and enable account AI consent before a live check.

### 2026-10-01 — live API checks and attachment-only photos

- User supplied keys privately in .env.local and authorized live testing while forbidding key inspection. Runtime-only Next environment loading was used; no key values, environment-file contents, authorization headers or raw provider error bodies were displayed. The environment file was not edited and remains Git-ignored. Synthetic WAV/image samples and sanitized reports are under ignored local-artifacts/live-ai-20261001.
- Live Deepgram nova-3 with automatic language detection repeatedly transcribed the synthetic English sentence exactly: Please help me carry drinking water upstairs. Real Cantonese recordings were not tested. The initial combined OpenRouter free-route test succeeded, but later free-route responses timed out while reading the body despite HTTP 200 headers. Increased the bounded OpenRouter response timeout from 20 to 60 seconds; current free-route latency still exceeds it intermittently. A process-only Qwen free-model test returned 429; a Gemini Flash alternative returned 403; a process-only dots free-model photo test passed in about 16.5 seconds. No model override was saved, and these historical image tests preceded the user's attachment-only correction.
- User then explicitly removed picture-to-text from scope: photos must be optional attachments and every request needs voice or text. Removed image payloads from OpenRouter and Gemini fallback, removed photo extraction fields/UI, and retained metadata-stripped photo storage plus matched-volunteer viewing. Both browser and server reject photo-only, empty/whitespace text and zero-byte audio without sending to providers or saving a request. Updated three-language form guidance, AI privacy text and README. Speech transcription remains active even alongside typed text; AI processing still requires account consent.
- Updated the opt-in scripts/check-live-ai.mjs to test speech/text classification with attachment-only photos; it blocks non-text OpenRouter messages and never sends images to providers. The final revised live test passed speech transcription, attachment preservation, no image analysis and typed-text retention, but OpenRouter text classification timed out at 60 seconds and correctly fell back to unassessed. Do not report the entire live provider pipeline as passed or deployment-ready.
- Validation passed: 16 mocked provider/intake/privacy tests, 9 existing API integration checks, mobile browser flow in English/Traditional/Simplified Chinese verifying no photo-only POST, successful text+photo and voice-only submissions, matched-volunteer photo rendering and unrelated-account denial; production build/TypeScript, ESLint and whitespace checks. Browser/API tests used synthetic accounts and an isolated temporary database with provider keys disabled; accounts were deleted and test server stopped. No commit, push or deployment occurred. Deployment/key instructions remain deferred pending reliable live OpenRouter classification.

### 2026-10-01 — authorized local commit

- User requested committing the speech/attachment changes to the existing codex/CareCall branch, explicitly excluding API keys. Staged the 16 related source, test, script, documentation and blank environment-template files; left the pre-existing docs/IMPLEMENTATION_ROADMAP.md untracked.
- Automated staged-blob checks passed for exact runtime-secret matches, credential patterns and private paths without printing key values. .env.local is ignored and untracked; the example file has blank API-key placeholders. Staged whitespace check passed. Previously recorded build, lint, provider and browser/API checks remain the validation basis; live OpenRouter timeout limitation remains documented.
- This authorization is for a local commit only. No push or deployment requested or performed.
