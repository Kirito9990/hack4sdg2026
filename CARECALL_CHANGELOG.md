# CareCall working memory and change log

Read this file before changing CareCall. Append one entry after each run; preserve earlier entries.

## User constraints (current)

- Work on local `codex/CareCall` only. Never modify, pull or push the teammate's `cursor/neighbourhood-mutual-aid-506d` branch.
- Push only when explicitly requested for deployment or rollback. Rollback of 36b1043 was completed previously; all current refinements stay local for review.
- Preserve the original cream/brown palette from 8845650. Do not change the overall color scheme without asking. Emergency priority colors are intentional.
- English / 繁體中文 / 简体中文 throughout.
- Request submission must remain actionable. Explain missing location and offer explicit GPS permission request plus manual map selection.
- A visible + attachment control must open the photo picker.
- Resident voice input: microphone, tap to start/stop, plus English / Mandarin / Cantonese. No browser dictation or speech-consent workflow. OpenRouter `qwen/qwen3.8-omni-flash` transcribes the recording, asks the follow-up question, and classifies the request. The interface language is sent in the prompt: English, Mandarin in Simplified Chinese, or Cantonese in Traditional Chinese. Browser webm is converted to 16 kHz WAV before upload.
- Account button opens a sidebar with vertically arranged account options leading to sections/pages.
- Preserve requested matched chat/photos/calls, resident completion and volunteer shift behavior while correcting the UI.
- Never include .env.local, secrets, or the local test-call destination in Git.
- Test denied/unavailable geolocation and permissions that have not been granted, not only pre-granted browser contexts.

## Known operational facts

- Render: https://carecall-djzc.onrender.com ; dashboard service srv-dar78s0u01pc738fn950.
- Actual Render service auto-deploys pushes to codex/CareCall even though render.yaml says autoDeployTrigger: off (manually created service).
- HTTPS is managed by Render. Local unpushed edits do not update production.
- Current LOCAL code uses single-process SQLite. Accounts and privacy settings are rows in carecall_users and carecall_privacy. Sessions, requests, and messages are read from carecall_sessions, carecall_requests, and carecall_messages; those tables are the runtime source of truth. The JSON snapshot in carecall_state is a backup written on save. The local file is .carecall-data/carecall.sqlite and is git-ignored. Use CARECALL_DB_PATH on a durable disk. Render free disk is ephemeral, so this local file does not make the public website durable. No verified phone authentication or account recovery. New accounts allow AI processing of submitted text. A resident can turn that off. AI consent off, or a failed classification, saves urgency NOT_ASSESSED rather than HIGH. Pending neighbourhood requests and medical requests, including emergency medical, are listed for an on-shift volunteer within 5 km.
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

### 2026-10-08 — larger resident composer and conditional request tabs

- Updated the working branch from b178648 to origin/codex/CareCall at fe48152. GitHub has no separate lowercase codex/carecall branch. User authorized publishing items 1 and 3; incentives remain a proposal until approval, followed by a local preview rather than an immediate push.
- Removed the map from resident request composition. The larger text area fills available space; picture and microphone controls have larger icons, labels and touch targets. A compact location status/retry control remains because nearby matching requires coordinates. Permission denial/timeouts preserve the draft and use map-free instructions in English, Traditional Chinese and Simplified Chinese. Request tracking/navigation maps remain available.
- Both roles now show two bottom tabs when there is no ongoing request. Residents get Requests for pending/accepted requests; volunteers get it for an accepted assignment. Completed requests are accessed through History. Refreshed the browser regression coverage for submission, restored requests, completion, responsive sizing, GPS retry and draft preservation. Test-created accounts now have distinct phone numbers where independent contexts are required.
- Live classification sampling (synthetic input, credentials loaded internally and never displayed): routine English returned LOW/NON_MEDICAL/neighborhood in 6.1s; unconscious/not-breathing English returned HIGH/MEDICAL/emergency medical in 49.0s; Traditional Chinese mobility timed out after 90s; Simplified Chinese fire returned HIGH/emergency nonmedical in 13.6s but incorrectly categorized MOBILITY. Classification is functional but not consistently reliable. Classifier code/model settings were not changed. Offline pipeline tests confirm failed/disabled AI stays NOT_ASSESSED and photos stay attachments.
- Validation: final production build/TypeScript, ESLint, and Git whitespace checks passed. The full test run passed 47 of 50 checks; the three affected/timing-sensitive browser checks (composer, progress and navigation) subsequently passed individually after the tab correction and test expectation updates. SQLite, authentication, request validation, HEIC/HEIF attachments, privacy, matching, chat, history and location checks passed. Localhost tests/build required execution outside the Windows sandbox; blocked localhost attempts were excluded from application results.
- Reviewed the final 360x740 Simplified Chinese composer screenshot in local-artifacts/ui-20261008/carecall-request-corrected.png; all controls and bottom tabs fit. Browser checks also cover English and Traditional Chinese. Isolated synthetic data only; no real accounts, native phone calls or production writes were tested. Keys, databases, screenshots and temporary npm tooling remain ignored. No incentive implementation was added.

### 2026-10-08 — private volunteer incentives, local preview only

- User approved item 2 with rewards reduced to 5/10/15 and monthly challenges plus 100/200/300-help badges. Implementation remains uncommitted and unpushed on codex/CareCall, based on 82756a0; preview approval is required before publishing. Existing docs/IMPLEMENTATION_ROADMAP.md was left untouched.
- Added CarePoints offers (LOW 5, MEDIUM 10, HIGH 15, NOT_ASSESSED 5), fixed when a volunteer accepts. Only resident-confirmed completion of an eligible accepted neighborhood request earns once. Self-help, emergency-service routes, cancellation and pre-feature requests earn nothing. No historical backfill.
- SQLite reward events and permanent badge unlock dates are saved atomically with request completion. A unique request ledger prevents duplicates; failed writes leave the request accepted in memory and in storage. Archive clearing and resident account removal preserve volunteer rewards; volunteer account deletion removes their rewards. The rewards API is authenticated and private to the signed-in volunteer.
- Added My Impact under the volunteer account menu and a compact Nearby summary, without another bottom tab. Includes lifetime help milestones 1/10/25/50/100/200/300, points milestones 100/500/1000, 3/7/30-day streaks and monthly challenges for 5 helps, 4 distinct helping days and 50 CarePoints. Calendar boundaries use Hong Kong time; monthly badges remain collected after reset and grant no additional points.
- Applied the user's revised minimalist direction: existing cream surfaces, muted green accents, flat warm-yellow badges, grey locked states, simple progress rings and quiet typography. Removed decorative medal gradients, ribbons, extra colors, slogans and workflow explanations. English, Traditional Chinese and Simplified Chinese supported; badge details are keyboard accessible.
- Validation: production build/TypeScript, ESLint and whitespace checks passed. The full 57-check run passed 55; the two failure entries were an existing API whitelist assertion and its parent suite, resolved by expecting the new public rewardPoints field; all 9 checks in that API suite then passed. New tests cover reward scale, frozen offers, exclusions, midnight/streak/month boundaries, permanent unlocks, database restart, rollback, concurrent duplicate completion, authorization, spoofed rewards, archive/account deletion, empty/earned UI states and responsive three-language layouts. The incentive UI test passed again on the final minimalist build. Missing test-tool resolution was corrected using the bundled NODE_PATH; sandbox-only execution failures were excluded from application results.
- Preview runs at http://127.0.0.1:47301/account/impact with an isolated synthetic SQLite database in ignored local-artifacts/incentives-20261008. Sample data includes 118 helps, 1,145 points, an earned 100-help badge and incomplete 200/300 badges. Final screenshots: impact-overview.jpg and impact-minimal-preview.jpg. No production data or external AI calls were used, API key contents were not viewed, and secrets/databases/artifacts remain ignored.

### 2026-10-08 — earned points merged into History, local preview only

- Removed Recent contributions from My Impact. Volunteer History rows now display the actual points earned for each completed request, with the existing earned-points detail retained when opening that request. Removed the separate latest-reward banner so points remain tied to their individual records. Resident History is unchanged; the existing seven-day history window and permanent aggregate rewards remain unchanged.
- Removed unused contribution UI styles/translations and updated the incentive UI regression to verify the absent duplicate section, +5 CarePoints in the History row and earned points in its detail.
- Validation: production build/TypeScript, targeted ESLint and whitespace checks passed. Incentive UI and existing history/chat/location UI tests both passed against the isolated test database. Visually verified the updated synthetic History preview at localhost:47301; screenshot saved to ignored local-artifacts/incentives-20261008/history-points-preview.jpg. No secrets viewed, no production data changed, and no commit or push. Last published change remains 82756a0 (larger resident composer, no composer map, conditional ongoing-request tab).

### 2026-10-08 — reward schema and upgrade verified before commit

- Reviewed the incentive database changes: carecall_reward_events (unique request id, 5/10/15 check, volunteer/date index), carecall_badges (unique volunteer/code) and nullable carecall_requests.reward_quote_json. Existing automatic initialization creates the additive schema on opening the database; production databases were not opened or changed in this review.
- Added a regression that reconstructs the pre-incentive schema, starts the updated persistence layer twice and verifies unchanged accounts, preferences, sessions, messages, existing requests and snapshot payload/revision. Confirms no retroactive awards, null legacy reward offers, unique event/badge constraints, valid point values and SQLite integrity. Documented migration and whole-database backup behavior in README.
- All 12 selected database, restart, migration, source-of-truth and archival tests passed, including the localhost archival test rerun outside the Windows network sandbox. Targeted ESLint passed. No application behavior changed this turn, and no commit or push was made.

### 2026-10-08 — final review and approved incentive release

- User approved committing after another review. Fetched origin and confirmed codex/CareCall matched GitHub before preparing the commit. Reviewed rewards, privacy, atomic completion, schema migration and UI changes; restored an unrelated accidental change to the existing Chinese completion message.
- Final production build/TypeScript and ESLint passed. All 9 targeted reward, upgrade/restart, atomic rollback, duplicate completion, authorization, monthly/streak, responsive incentive UI and History/chat checks passed. The 12 database regression checks from the preceding review also passed.
- Commit scope includes incentive code, additive database schema, English/Chinese UI, History point displays, regression coverage and documentation. Existing docs/IMPLEMENTATION_ROADMAP.md remains excluded. API keys, .env files, databases, synthetic demo data and screenshots remain excluded.

### 2026-10-08 — responsive badge dialog centering

- Reproduced the reported badge modal at x=0/y=0 in a 390x844 browser viewport. Tailwind Preflight resets margin to zero, overriding the dialog's browser-default centering. Added explicit fixed positioning, inset:0 and margin:auto to .award-dialog; retained bounded height and internal scrolling and contained scroll chaining.
- Extended the incentive UI regression to check horizontal/vertical centering, at least 15px viewport clearance, no horizontal overflow and reachable close actions at 320x568, 360x740, 390x844, 430x932, 844x390 and 1280x800 in English, Traditional Chinese and Simplified Chinese. Covers locked, monthly and earned badge dialogs.
- Production build/TypeScript, targeted ESLint and whitespace checks passed. The expanded incentive UI and History/chat checks passed. The resident composer/media/navigation check initially timed out after signup in the shared test run; it passed when rerun alone on a fresh isolated database. No application change was needed for that timeout.
- Visually verified the centered mobile modal and saved ignored screenshots badge-dialog-mobile.jpg and badge-dialog-mobile-zh.jpg under local-artifacts/incentives-20261008. Testing used desktop Chromium with simulated viewports, not physical iOS/Android hardware. Viewport override was reset after capture; local preview remains available. No database changes, API-key reads, commit or push for this fix.

### 2026-10-08 — authorized mobile-dialog deployment

- User authorized commit and deployment of the tested badge dialog centering fix. Confirmed local codex/CareCall matches origin at 20122b8 before publishing. Scope is limited to the dialog CSS, responsive regression coverage and this log; existing roadmap, environment files, keys, databases and preview artifacts are excluded.
- Publishing through the existing codex/CareCall -> Render service at carecall-djzc.onrender.com. Public health and deployed stylesheet verification follow the push; no Render environment values or billing settings are changed.

### 2026-10-12 — follow-up questions only when text is not assessed

- After Send, the resident request is classified as before. HIGH, MEDIUM, or LOW saves immediately and does not open a chat. When AI processing is allowed and the result is NOT_ASSESSED, the request is not saved yet. A two-question chat asks what happened and how soon help is needed. Each answer is added to the original text and classified again. A successful classification stops the questions and saves the request. After both answers, or if the resident presses Send request now, the combined text is saved even if it is still NOT_ASSESSED. AI consent off still saves immediately as NOT_ASSESSED, because another question cannot be classified.
- English, Traditional Chinese, and Simplified Chinese. Original cream palette. The composer shrinks while the chat is open so the question stays on screen.
- Validation: node --test tests/clarify.test.mjs passed 3/3. ESLint passed on the changed TypeScript files. Browser check on an isolated server at 127.0.0.1:47311 with no model key: AI off sent "Please bring water upstairs." with no chat; AI on held "hello", showed the first question, kept the request unsaved, then showed the second question after an answer; Send request now saved the combined text as awaiting assessment. The question, answer box, and both actions fit at 390x740 with no horizontal overflow. Traditional and Simplified Chinese strings rendered. No live OpenRouter call, so the skip-on-success path was checked in the unit test rather than against a model. Synthetic test database deleted. No commit or push.

### 2026-10-12 — AI text processing on for new accounts; medical requests reach volunteers

- New accounts start with AI processing of submitted text turned on. The privacy setting still controls it, and a resident can turn it off. Accounts created earlier keep the setting already saved. English, Traditional Chinese, and Simplified Chinese privacy copy now says the setting starts on.
- Pending medical requests are included on the volunteer nearby list and can be accepted. That covers emergency medical dispatch and any request whose category is medical. The volunteer must still be on shift and within 5 km. Emergency medical requests still earn no CarePoints. The call-999 control remains on an open emergency request.
- Validation: node --test tests/volunteer-receive.test.mjs passed. ESLint passed on the changed TypeScript files. On the running local server, a new account returned allowAI true, and an on-shift volunteer at the pending requests' location received all 8 pending tasks, including the 3 medical ones. Browser check: a new volunteer account showed the AI processing checkbox checked and the privacy notice saying it starts on; after going on shift, the nearby list showed Medical / High cards with Accept. The temporary account was deleted. No request was accepted. No commit or push.

### 2026-10-12 — Mandarin and Cantonese voice transcription

- The resident composer now has English, Mandarin, and Cantonese next to the microphone. The choice follows the interface until the resident picks one: English, Cantonese for Traditional Chinese, Mandarin for Simplified Chinese. A manual choice stays when the interface language changes.
- Deepgram Nova-3 now receives an explicit language: en, zh-CN, zh-Hant, or zh-HK. Open detection was labeling Cantonese as English and returning an empty transcript. detect_language=zh-HK is rejected by the API. The unused automatic fallback is limited to English and Mandarin.
- Validation: node --test tests/speech-language.test.mjs passed. ESLint passed on the speech route, triage route, speech helper, and request form. Live Nova-3 calls with synthesized speech: Cantonese with zh-HK returned 我行唔倒落樓梯需要一支電筒同樽裝水; the same clip with English or automatic detection was empty. Mandarin with zh-CN returned simplified text and with zh-Hant returned traditional text; English mode was empty. Browser check on the local server: the three choices rendered, Traditional Chinese selected 廣東話, Simplified Chinese selected 普通话, and a manual Cantonese choice stayed selected after switching the interface to English. At 360×740 the page did not overflow; the text box stayed above 180px and the photo and microphone controls stayed large. The temporary account was deleted. No commit or push.

### 2026-10-12 — voice recording no longer reports a failed connection

- Stopping a recording threw before the audio was sent. The transcript variable reused the name of the spoken-language state, so reading the language inside that block failed. The unknown error was shown as “Connection failed. Please retry.” and /api/speech was never called.
- The transcript now uses its own name, so the selected English, Mandarin, or Cantonese code is sent with the clip.
- Validation: a browser recording on the local server reached POST /api/speech (400 after 4.4s for a test tone with no speech) and showed the transcription-unavailable message instead of a failed connection. The temporary account was deleted. No commit or push.

### 2026-10-12 — GitHub version kept, login password eye retained

- Fast-forwarded local codex/CareCall to origin 9c3cdc1 and dropped the overlapping local clarification, model, and changelog edits. The working tree now matches that commit except the login password visibility control.
- Login still has the show/hide password button, cream styling, and English / Traditional Chinese / Simplified Chinese labels. No commit or push.

### 2026-10-12 — follow-up asks one missing item, and the chat can be spoken

- Follow-up questions are no longer the same two prompts. Each question asks for the first gap still missing, in order: what help is needed, one practical detail, then when the resident hopes it will be done. A gap already present in the draft, or already asked, is skipped. At most two questions are asked. A classified result, a complete draft, or Send request now still saves immediately.
- Each chatbot question is spoken with the browser voice for the current interface language, and can be replayed. The follow-up box has its own microphone; a transcript is added to the answer, using the selected English, Mandarin, or Cantonese recognition. No extra speech provider was added.
- Validation: node --test tests/clarify.test.mjs tests/speech-language.test.mjs passed 6/6. ESLint passed on the changed files. Browser check on the local server, with triage intercepted so no model was called: “Please buy rice.” asked only for one detail and spoke that question; answering “2 kg” then asked when it should be done. Traditional Chinese showed both questions, the replay control, and the answer microphone. At a 390px-wide viewport the page did not scroll sideways. The temporary browser interception was removed and the earlier saved position was restored. No commit or push.

### 2026-10-12 — volunteer can cancel an accepted request

- The assigned volunteer now has Cancel this request on an accepted task. Cancelling closes it as cancelled, stops location sharing, and earns no CarePoints. Another volunteer cannot cancel it, and a resident still cannot use this action. Confirming completion stays with the resident; a volunteer calling the completion route is still refused.
- English, Traditional Chinese, and Simplified Chinese. The button asks for confirmation before closing.
- Validation: node --test tests/volunteer-cancel.test.mjs passed against the local server. A fictional request was accepted, volunteer completion was refused, volunteer cancel closed it with no points, and a later resident confirmation still awarded 5 CarePoints. Temporary accounts were deleted. The open resident browser session was not switched. No model call, no commit or push.

### 2026-10-12 — voice note after acceptance, police report button, transcription follows language

- A resident voice recording is stored with the request. The resident can play it. A volunteer receives the playable recording only after accepting; it is not included on the nearby list, and completed records hide it.
- Nearby requests, the open request, and history each have Report malicious act to police. The button opens the phone app at 999. CareCall does not contact the police.
- Voice transcription no longer has a separate language picker. English uses English, Traditional Chinese uses Cantonese, and Simplified Chinese uses Mandarin.
- Validation: node --test tests/voice-note.test.mjs and tests/speech-language.test.mjs passed. On the local volunteer nearby list, the report control was a tel:999 link, the Traditional Chinese label was 向警方報告惡意行為, and the page did not scroll sideways. No request was accepted, so the in-task player was not opened against a live request. No model call, no commit or push.

### 2026-10-12 — credibility ratings after a completed request

- After a request is completed, the resident and the volunteer can each leave one rating from 1 to 5. A cancelled request cannot be rated, and a second different rating is refused. CarePoints are unchanged.
- A person is flagged as low credibility when at least two completed-request ratings average 2 out of 5 or below. One low rating is not enough. The matched partner sees the average. A nearby volunteer sees only the flag, not the score. The flag also appears on an accepted request.
- English, Traditional Chinese, and Simplified Chinese.
- Validation: node --test tests/ratings.test.mjs passed. The local API test completed two fictional requests, recorded 1 and 2 point ratings both ways, flagged both people, showed the flag on the next nearby listing, kept CarePoints at 10, and rejected a rating on a cancelled request. Temporary accounts were deleted. The open volunteer history only contained cancelled requests, so the rating form correctly stayed hidden there. No model call, no commit or push.

### 2026-10-12 — friends after a completed request, community tab

- After a request is completed, the resident and the volunteer can each accept a friendship. They become friends only when both accept. One decline blocks that request. Cancelling a request cannot start a friendship. A later completed request between the same two people stays friends without asking again. CarePoints are unchanged.
- Community, on both the resident and volunteer tabs, lists friends by name and opens a text chat. Phone numbers in messages are masked. If either person turns chat off, the thread cannot be read. Incoming friend requests also appear there, without the other person's phone number.
- English, Traditional Chinese, and Simplified Chinese.
- Validation: node --test tests/friends.test.mjs and tests/friends-api.test.mjs passed. The local API test used fictional requests: one acceptance did not create a friendship, both acceptances did, chat worked both ways, a phone number in a message was masked, a decline did not add a friend, a cancelled request was refused, and CarePoints stayed at 10. Temporary accounts were deleted. The open volunteer account was not switched; its history is cancelled, so the add-friend control was not shown there. The Community tab opened and showed no friends. No model call, no commit or push.

### 2026-10-12 — nearby requests ranked by urgency, waiting time, then distance

- A volunteer's nearby list now orders pending requests by urgency, then by how long they have waited, then by distance. High comes before medium, low, and not assessed. Within the same urgency, the older request comes first even if it is farther away. CarePoints and matching distance limit are unchanged.
- Each card shows its place in that order, the urgency, and the waiting time.
- English, Traditional Chinese, and Simplified Chinese.
- Validation: node --test tests/request-priority.test.mjs passed. The open volunteer nearby list showed one low request as priority 1 with a waiting time, in English and Traditional Chinese, without sideways scrolling. That request was not accepted. No model call, no commit or push.

### 2026-10-12 — follow-up questions use Qwen3.7 Flash

- Follow-up questions now come from OpenRouter model `qwen/qwen3.7-flash`. Request classification still uses `OPENROUTER_MODEL`. The question still fills only the first missing item, in order: need, one detail, then desired time, and still stops after two questions.
- If the model times out, returns nothing usable, or includes a phone number, the existing fixed question is shown and the resident can still send the request directly.
- Validation: node --test tests/clarify-question.test.mjs and tests/clarify.test.mjs passed. No live OpenRouter call was made. No commit or push.

### 2026-10-12 — follow-up questions stay on a layer until the answer is specific

- A vague answer no longer skips ahead. The questions move in order: what help is needed, then how many or which floor, then when. If the answer is still too general, the same step is asked once more in shorter words. A step already answered is skipped. At most four questions are asked, and the resident can still send the request at any time.
- A high-urgency result is saved immediately. A lower or unassessed result keeps asking while a step is missing. Qwen3.7 Flash writes the question; if it fails, the fixed shorter question is used.
- English, Traditional Chinese, and Simplified Chinese.
- Validation: node --test tests/clarify.test.mjs and tests/clarify-question.test.mjs passed. “幫忙” stays on the first step, “買米” moves to quantity, and “2 kg” moves to time. No live model call, no commit or push.

### 2026-10-12 — follow-up questions only fill a clear request

- Follow-up questions now exist only to make one request clear. At most two are asked, one at a time, and only for a missing essential item. A question is never repeated. If the task is still unclear after it was asked, the resident confirms instead of being asked how many. Buying or carrying something can ask for a quantity or floor; spending time together does not. A request that already says what and when skips the questions.
- Before a non-urgent request is saved, the resident sees a short summary and can edit it. High urgency, AI switched off, and “Send request now” still save immediately. If the model returns nothing usable, or asks for a name, phone, or address, the fixed question is used.
- English, Traditional Chinese, and Simplified Chinese.
- Validation: node --test tests/clarify.test.mjs and tests/clarify-question.test.mjs passed. “今晚陪我聊天” asks nothing, “陪我聊天” asks only when, and “Please buy rice” asks for a quantity. No live model call, no commit or push.

### 2026-10-12 — request classification uses Qwen3.7 Flash

- Priority assessment now uses `qwen/qwen3.7-flash`. The free router had reached its daily limit, so new requests were saved as not assessed. An unset model and the old `openrouter/free` value both use Flash, including in the already running local server. A different `OPENROUTER_MODEL` is still honored.
- The request already accepted tonight stays not assessed. No live model call, no commit or push.
- Validation: node --test tests/clarify-question.test.mjs and tests/ai-pipeline.test.mjs passed.

### 2026-10-13 — volunteers can preview partner redemption

- The volunteer impact page now lists example shops CareCall could connect: a bakery coupon for 30 CarePoints, a grocery coupon for 50, and a pharmacy product VIP for 100. Redeeming spends only the available balance. Each offer can be redeemed once. Residents cannot redeem, and the 5/10/15 earning rules are unchanged.
- Reaching 100, 500, or 1000 earned CarePoints still grants the existing award. Spending points does not remove it.
- English, Traditional Chinese, and Simplified Chinese. These offers are not a live payment.
- Validation: node --test tests/redeem.test.mjs passed. The open browser session was a resident, so the volunteer impact page was not opened and no points were spent. No model call, no commit or push.

### 2026-10-13 — volunteers see a popup for a new nearby request

- An on-shift volunteer now gets a popup when a request appears nearby after the list has already loaded. The first list does not pop up. The popup shows the category, urgency, and approximate distance, and can open the nearby list. It does not show the resident's name, phone, or address.
- English, Traditional Chinese, and Simplified Chinese.
- Validation: node --test tests/request-priority.test.mjs passed. A later live check created one nearby test request with AI off. The open volunteer page popped up “Other · Not assessed · Approx. 0.0 km” without changing the request already in progress. No model call, no commit or push.

### 2026-10-13 — one OpenRouter model handles speech, follow-up, and classification

- Transcription, follow-up questions, and priority classification now use OpenRouter `google/gemini-2.5-flash-lite`. Deepgram is no longer called. An unset model and `openrouter/free` both use this Gemini model. A different explicit model is still honored.
- Browser recordings are converted to 16 kHz WAV before upload, because the chat audio input does not accept webm. English, Mandarin in Simplified Chinese, and Cantonese in Traditional Chinese are still chosen from the interface language.
- Validation: model-selection, transcription-request, clarify, speech-language, and ai-pipeline tests passed. Auth, request validation, image formats, friends, credibility, rewards, and volunteer cancel passed against a temporary local server. No `OPENROUTER_API_KEY` was present, so no live model call was made. No commit or push.

### 2026-10-13 — local OpenRouter key, Qwen Omni because Gemini is region-blocked

- The teammate's OpenRouter key is in gitignored `.env.local`. The Deepgram key is stored there too, and the app does not call Deepgram.
- A live call to `google/gemini-2.5-flash-lite` returned HTTP 403, model unavailable in this region. `qwen/qwen3.8-omni-flash` answered from the same network: a text ping, an empty transcript for a tone with no speech, one follow-up question, and a JSON priority. Transcription, follow-up, and classification now default to that model.

### 2026-10-14 — larger history summary, report only while helping, add friend on Community

- The completed-request summary card now fills the space under the tabs, and the 1–5 rating buttons are larger. Removed the small notes under that card: the 999 explanation, the hidden-contact sentence, and the seven-day line.
- Report malicious act to police stays on an accepted request only. It is no longer on every nearby card or inside history. The button still opens the phone app at 999, without the extra sentence underneath.
- Adding a friend is no longer inside history. Community lists people from completed requests; opening one is its own page, like opening a message. Both people still have to accept. English, Traditional Chinese, and Simplified Chinese.
- Validation: ESLint passed on the changed files. `node --test tests/friends-api.test.mjs` passed against an isolated server on port 47341. Browser check at 390×844: history summary had no report button and no descriptive lines, the card filled the stage, Community opened an add-friend page, the nearby list had no report control, and the accepted request still had the tel:999 report link. Accepting the friend request moved that person into Messages. Synthetic accounts stayed on the isolated database. No commit or push.

### 2026-10-14 — ratings removed

- Completed requests no longer ask for a 1–5 rating. The credibility average and the low-credibility flag are gone from history, the active request, and the nearby list. The rating route is removed. Old rating rows stay in the database and are not shown. CarePoints are unchanged.
- Validation: ESLint passed on the changed files. Browser check on the isolated server: a completed history summary showed the request text and no rating controls. No commit or push.

### 2026-10-14 — active chat actions share one row

- Removed the sentence under Report malicious act to police. On an accepted request, Cancel (or the resident’s completion button) and Report sit on one row, so the message area can use that space. The conversation log now stays at least 220px tall and grows with the screen.
- User asked to publish this layout change on codex/CareCall. Render auto-deploys that branch.

### 2026-10-14 — CareCall icon

- The supplied two-person heart mark is now the app icon: browser tab favicon, Apple touch icon, the header beside CareCall, and the login page. The mark fills the icon square on the cream background. On the page itself the background is transparent so it sits on the existing cream surface.
- The previous favicon.ico was removed so the browser tab uses this mark. Validation: ESLint passed on the header and login files. Browser check on the local server at port 47291: the login page shows the mark in the header and above Log in, on the cream background, and the document head links the icon and Apple touch icon.

### 2026-10-14 — icon only in the header

- The large mark above Log in is removed. The icon stays in the top-left corner, next to CareCall. Login spacing is a little tighter so a phone screen does not have to scroll; buttons stay at least 48px tall.
- Validation: on a 390×844 phone and a 375×667 phone, Log in fits without scrolling. Create account fits at 390×844. On the shorter phone, Create account still needs a short scroll because of the name, privacy agreement, and location note. User asked to publish the icon and this login layout on codex/CareCall. Render auto-deploys that branch.

### 2026-10-14 — clearer phone navigation, same warm palette

- Bottom tabs no longer use the small symbols. The words are 15px and the current tab is the existing dark ink on cream, so the selected page is obvious. The tiny uppercase role label above the page title is hidden.
- Waiting and pending notices use warm sand instead of the cold blue. Completed and emergency colors stay as they were. On a new request, “Use my location” is a full-width 48px button and stays with Send, instead of a small control beside the hint.
- Validation: ESLint passed. On the local server at 390×844, a temporary resident saw New request, Community, and History without clipped labels, and the request screen did not scroll. At 375×667 the location button and Send stayed on screen; the writing box can scroll inside itself. The temporary account was deleted. User asked to publish this navigation layout on codex/CareCall. Render auto-deploys that branch.

### 2026-10-14 — follow-up answers on their own page

- Phone tabs and waiting colors are back to the previous version. A new request no longer shows “Use my location” or “Location ready”. Location is still requested when the resident sends, and a denied location keeps the draft with the existing retry message.
- A follow-up question now opens its own page, with a large question and answer area, a Back control, and the same photo and voice controls together. The resident can send the answer or send the request immediately. Checking the wording before posting uses that same page.
- Validation: ESLint passed on the changed files. On the local server at 390×844, the request screen had no location labels and did not scroll. Sending “Can someone help carry my shopping?” opened the follow-up page with the question, a larger answer box, Add photo, and Tap to speak, without page scrolling. The temporary account was deleted. User asked to publish these follow-up and sent-request changes on codex/CareCall. Render auto-deploys that branch.

### 2026-10-14 — follow-up asks the task, then the current place

- The first follow-up asks what help is needed when that is still unclear. The second asks where the resident is now. A request that already contains both skips the questions. High urgency still posts immediately.
- On the place question, a resident who has not allowed device location sees a reminder and can turn that privacy setting on. The browser permission is requested then, and the choice is saved.
- Validation: `node --test tests/clarify.test.mjs tests/clarify-question.test.mjs` passed. User asked to publish these follow-up and sent-request changes on codex/CareCall. Render auto-deploys that branch.

### 2026-10-15 — sent request shows category and priority

- After a request is sent, the waiting card no longer has an expand control. The category and priority are shown immediately under “Request sent successfully”. The map stays, and it can still open full screen.
- Validation: on the local server at 390×844, a temporary resident’s sent request showed Mobility and Low without an expand control, with the map still underneath. The temporary account was deleted. User asked to publish these follow-up and sent-request changes on codex/CareCall. Render auto-deploys that branch.

### 2026-10-15 — the task question waits until a neighbour could act

- A verb alone no longer counts as a complete request. Buying, carrying, or repairing must name the item or the amount before the follow-up moves on to where the resident is. A still-vague answer gets one more question about the task. Company, such as chatting, is already a complete task. High urgency still posts immediately.
- Validation: `node --test tests/clarify.test.mjs tests/clarify-question.test.mjs` passed. User asked to publish this task-completeness check on codex/CareCall. Render auto-deploys that branch.
