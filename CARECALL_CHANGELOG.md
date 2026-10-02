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
- Current LOCAL code uses single-process SQLite. Accounts and privacy settings are rows in carecall_users and carecall_privacy. Sessions, requests, and messages are read from carecall_sessions, carecall_requests, and carecall_messages; those tables are the runtime source of truth. The JSON snapshot in carecall_state is a backup written on save. The local file is .carecall-data/carecall.sqlite and is git-ignored. Use CARECALL_DB_PATH on a durable disk. Render free disk is ephemeral, so this local file does not make the public website durable. No verified phone authentication or account recovery. AI consent off, or a failed classification, saves urgency NOT_ASSESSED rather than HIGH.
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

### 2026-10-01 — Deepgram and OpenRouter merge into current lib

- Merged the working Deepgram listen call into lib/speech.ts: nova-3 (still overridable with DEEPGRAM_MODEL), smart_format, punctuate, video/webm sent as audio/webm, and provider status in thrown errors. Kept the existing (audio, mimeType, language) signature, auto language detection, 20s timeout, and 4000-character cap. Upload validation still uses the raw content type, so unknown types are not accepted as audio/webm.
- Merged the working OpenRouter triage handling into lib/openrouter.ts and lib/ai.ts: stricter classification rules, resilient JSON extraction, and enum normalization (for example non-medical / neighbour help). Kept triageTextWithOpenRouter(text, locale), OPENROUTER_MODEL, the 20s timeout, and the rule that names and phone numbers are not sent or written into the summary. Invalid model output still throws so the triage route can fall back.
- Validation: ESLint passed on lib/speech.ts, lib/openrouter.ts, lib/ai.ts, and app/api/triage/route.ts. A tsx check confirmed fenced JSON, non-medical/neighbour normalization, invalid-text rejection, and webm content-type stripping. Full tsc still fails on pre-existing leaflet types and lib_workingAPI_v1 type mismatches; the merged lib files were not in that error list. No UI change and no live provider call. No commit or push.

### 2026-10-01 — speech transcript and volunteer brief

- After a resident stops recording, `/api/speech` sends the clip to Deepgram and puts the transcript in the request box, with a note that it can be edited before sending. This still requires the account AI-processing switch and `DEEPGRAM_API_KEY`. Names and phone numbers are redacted before the text is shown.
- OpenRouter now returns requirements, tools, and resources with the existing type, priority, and summary. Loose model labels such as `urgency` instead of `urgency_level`, and a missing dispatch action, still become a valid neighbourhood brief.
- The resident request card and the volunteer nearby list show priority, the summary, and those three lists. Spoken text is labeled separately when it differs from the summary.
- Validation: ESLint passed. In the browser, a spoken sample became “I need a flashlight and bottled water. I cannot walk down the stairs.” Sending it produced a Medium mobility brief with flashlight, bottled water, and stair help, visible on the resident card and the volunteer nearby list. An empty audio `src` on the first render threw a Next overlay; the player now waits for the object URL. Synthetic test accounts and requests were removed. No commit or push.

### 2026-10-01 — urgency was the fallback, not the model

- The four local test requests are stored as source fallback with urgency HIGH. OpenRouter never saved a level for them. The route discards a failed or slow model call and the fallback is hardcoded High, so the pill said High even for snack and noodle requests.
- A live OpenRouter call for a snack request returned LOW / NON_MEDICAL. An unconscious-and-not-breathing reply used category EMERGENCY_medical and priority HIGH; that shape was rejected and would also have been saved as High. Parsing now maps that shape to MEDICAL / EMERGENCY_medical / HIGH, accepts Low/Medium/High wording, waits 45 seconds, and retries once.
- Unassessed requests now show “Not assessed” on a neutral card instead of the High pill. A new send is required before an old fallback request gets a model level. ESLint passed. No commit or push.

### 2026-10-01 — withdrew the user-table push

- User asked to undo the push of the account and privacy tables. Remote codex/CareCall was force-updated from e2eec7b back to 1162ac5. Local branch was reset to the same commit. Render will auto-deploy 1162ac5. The table commits remain recoverable as 86cd3d3 and e2eec7b. This note is local and not pushed.

### 2026-10-01 — local SQLite database restored, not pushed

- User asked for a free database that can store accounts, with later work staying local until a successful test, and only then a push to codex/CareCall. Restored the user and privacy tables locally from 86cd3d3 onto 1162ac5. Created .carecall-data/carecall.sqlite on this machine with carecall_users and carecall_privacy empty. Persistence tests passed 2/2. No cloud database account, no commit, and no push.
- 2026-10-01 local server check on port 47294 with an isolated test database: signup, session reload, and privacy update returned 200. After stopping and starting the server, the same cookie loaded the name, phone, address, and privacy flags from SQLite. The synthetic database was deleted. Volunteer shareLocation is not a table column, so that flag is not restored.
- User asked to push this tested local change to codex/CareCall. Render auto-deploys that branch. The public site's free disk remains ephemeral.

### 2026-10-01 — production save check

- User reported the website still could not store data after the push. Live checks against https://carecall-djzc.onrender.com returned 200 for health, signup, session read, address/privacy update, and account deletion. The synthetic account was deleted. Saving works while that server process stays up. Render free disk still drops the SQLite file on sleep, restart, or redeploy, and login always creates a new account instead of reopening one by phone. No further push.

### 2026-10-01 — returning login keeps the saved account

- Same phone number and role now opens the existing account instead of creating a blank one. Name, address and privacy settings stay as saved. A different role with that phone remains a separate account. Added the missing shareLocation column so that flag survives a restart.
- Local check on port 47296: signed out, signed in again under another typed name, and still received the original id, name, address and privacy flags. After a server restart the same login returned that account. Typecheck passed. The synthetic database was deleted. Not pushed. Render's free disk can still erase the file when the public site sleeps or redeploys.

### 2026-10-01 — withdrew the account-table push, then continued locally

- User asked to withdraw the previous push before continuing the returning-login work. Published revert dfb0794 on codex/CareCall, restoring the remote tree to 29d3307. Render will auto-deploy that revert. The account tables and returning login stayed local as cherry-pick fb24a24 plus the login changes.
- User then asked to push this local work to codex/CareCall. Render will auto-deploy it. The public site's free disk remains ephemeral.

### 2026-10-01 — create account and log in are separate

- The login page now starts on Log in (phone and role only). First-time users press Create account, then enter a name, accept the privacy notice, and allow a location request. Creating an existing phone and role is rejected. Logging in without that account is rejected. Requests that omit a mode still open or create an account, so existing API tests keep working.
- Local check on http://127.0.0.1:47291: Create account opened the registration form, saved Ada Lam, and opened the resident page. Sign out returned to Log in. Logging in with the same phone and Resident role showed Ada Lam again. The API rejected a second create with accountExists and a missing login with accountNotFound. The synthetic account was deleted.
- User asked to push this to codex/CareCall. Render will auto-deploy it. The public site's free disk remains ephemeral.

### 2026-10-01 — password required before a session

- Create account and log in now require a password of 8–72 characters. The session cookie is issued only after that check. Phone number and role still identify the account. `mode: "continue"` no longer creates an account. Passwords are stored as bcrypt hashes in `carecall_users.password_hash` and are removed from API responses. Eight failed attempts for the same phone and role are rejected for 15 minutes. Accounts created before this change have no hash and cannot be opened until a password exists. AI classification and the request/session JSON snapshot were not changed.

### 2026-10-01 — authentication review

- Sessions saved before password login do not have `passwordAuth` and are removed from the server store, so the old cookie no longer opens an account. Login failures for a missing account, a wrong password, and an account with no password hash all return the same error. Failed-attempt counts live in this process and reset on restart. The local database had one development account without a hash and two old sessions; those sessions are discarded, and the account cannot be claimed with the phone number and role. No password recovery was added.

### 2026-10-01 — request text or transcript required

- A request is saved only when it has typed text or a successful voice transcript. An empty form and a photo with neither are rejected. Voice with a transcript, including with a photo, is still accepted. Audio that does not produce a transcript is rejected. Authentication, the database schema, and the Deepgram and OpenRouter clients were not changed.

### 2026-10-01 — one classification pipeline

- Typed text, a voice transcript, and a Gemini image description are prepared together before classification. OpenRouter classifies that text. It does not receive image bytes. If OpenRouter fails, Gemini classifies the same text, and sees the image only when the description step failed. AI consent off or a failed classification saves the request as source fallback with urgency NOT_ASSESSED. Authentication, request validation, and the database schema were not changed.

### 2026-10-01 — snapshot tables, reads unchanged

- Sessions, requests, and messages can be copied from the JSON snapshot into carecall_sessions, carecall_requests, and carecall_messages. The copy runs in one transaction, leaves the JSON payload in place, and keeps only sessions with passwordAuth true. Later saves write the JSON snapshot and those tables. Application reads still come from the JSON snapshot.

### 2026-10-01 — session reads use SQLite

- Authentication looks up the session cookie in carecall_sessions. The JSON sessions array remains the backup copy and is still written. Requests and messages still load from the JSON snapshot. A session without password authentication, or older than 30 days, is not accepted.

### 2026-10-01 — request reads use SQLite

- Request lists load from carecall_requests in snapshot position order. The JSON requests array remains the backup and is still written. Messages still load from the JSON snapshot. Optional request fields stay absent when the table cell is NULL.

### 2026-10-01 — message reads use SQLite

- Chat messages load from carecall_messages in snapshot position order. The JSON messages array remains the backup and is still written on save. Sender, text, image data, and timestamp come from the table. A read does not rewrite the JSON payload.

### 2026-10-01 — sessions use SQLite for reads and writes

- The in-memory session list loads from carecall_sessions. Login, logout, and account deletion change that list and the save writes it back to the table and to the JSON backup. A session that exists only in the JSON payload is not restored on the next load. Request and message handling is unchanged.

### 2026-10-01 — nearby volunteer list omits the request summary

- The open-task list no longer includes the request summary, transcript, resident identity, or photo. It still includes the request id, category, urgency, approximate location, distance, and matching lists. The matched request and chat still show the details that privacy settings allow after acceptance. Authentication, the AI pipeline, and database storage were not changed.

### 2026-10-02 — documentation matches SQLite reads and unassessed fallback

- README and the known-facts section now say carecall_sessions, carecall_requests, and carecall_messages are the runtime source of truth, and the JSON snapshot is a backup. They also say a missing or failed classification saves urgency NOT_ASSESSED, not HIGH. Application code was not changed. Dated entries above remain the record of each earlier phase.

### 2026-10-02 — photos stay attachments

- A request photo is validated and stored, and it is not described or classified. OpenRouter still classifies typed text and voice transcripts only. If that call fails, or AI consent is off, the request is saved as NOT_ASSESSED. Authentication and the database schema were not changed.

### 2026-10-02 — mobile photo formats

- JPEG, PNG, and WebP uploads still follow the previous resize, EXIF rotation, 8 MB, and 25 megapixel checks. HEIC and HEIF uploads are converted to JPEG before those checks so a browser can display them. The stored attachment stays `imageStatus: prepared` and is not sent to a model. An image with no text or transcript is still rejected. Authentication, classification, and the database schema were not changed.

### 2026-10-03 — production build type check

- `heic-convert` now has an ambient declaration, and the login-attempt timestamps in `lib/server.ts` are typed as numbers. `npm run build` completed, including TypeScript checking. Conversion, authentication, and request handling were not changed.
