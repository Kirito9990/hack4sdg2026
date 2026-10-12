# CareCall

Local community assistance prototype with English, 繁體中文 and 简体中文. Residents submit requests; nearby volunteers accept them. Both participants see acceptance, temporary chat and call controls.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:47291. Copy `.env.example` to `.env.local` for optional providers. Do not overwrite an existing environment file. Microphone and GPS need localhost or HTTPS; a plain HTTP LAN address may not support them.

## Test with two people

Use separate browser profiles (or a normal and private window); tabs in the same profile share the same session cookie.

1. Create a resident session. Eight-digit Hong Kong numbers are normalized to +852. Enable “Allow my matched partner to call me” to test calling.
2. Submit text, a recording or a photo. Grant location access.
3. In the second profile create a volunteer session nearby, turn on the shift switch, and accept the request. Both pages poll automatically.
4. Exchange text and photos in the temporary conversation; its header includes the call button. Refreshing either page restores that session's requests.
5. “Call resident” shows the current shared number; “Open phone app” opens a `tel:` link in the device's dialer. It does **not** create a browser VoIP call. A capable phone or configured desktop calling app is needed. No calls are made automatically.
6. If `CARECALL_TEST_CALL_PHONE` is set in the server environment, volunteer-to-resident calls use that test destination. The UI labels it, the resident's stored number stays unchanged, and emergency calling still uses `NEXT_PUBLIC_EMERGENCY_NUMBER` (999 by default). Clear the override to call the real resident.
7. Account centre controls call sharing, chat and external AI processing. Residents confirm completed help (or cancel a pending request); the volunteer sees the updated status. Completion makes chat read-only for 7 days; older history is hidden from the UI but retained in the database until deleted.

The local test override is in ignored `.env.local`, not the committed example.

## Storage, identity and privacy

This version has a Next.js API backend and local SQLite persistence (Node >=22.13). A single server process owns the store. Users, 30-day sessions, privacy preferences, optional three-line addresses, requests and conversations survive server restarts on the same persistent disk. Create account registers a phone number, role, and password. Log in requires that password as well as the same phone number and role, then opens the saved account, including the name, address and privacy settings. Passwords are stored as bcrypt hashes. A different role with that phone is a separate account. Phone ownership is not verified.

Set CARECALL_DB_PATH to an absolute writable database path. The default is .carecall-data/carecall.sqlite under the server working directory; database files are Git-ignored. Keep one process per database. Accounts and privacy settings are rows in `carecall_users` and `carecall_privacy` (name, phone, role, password hash, shift availability, address, privacy acceptance time, and the six consent flags). Sessions, requests, and messages are read from `carecall_sessions`, `carecall_requests`, and `carecall_messages`. Those tables are the runtime source of truth. Each save also writes the JSON snapshot in `carecall_state` as a backup. An older snapshot-only file is copied into the tables on load. This is still one process per file, not a multi-instance database. Production requires verified authentication and a shared database such as PostgreSQL.

Volunteer rewards use `carecall_reward_events` (one event per request, indexed by volunteer and date) and `carecall_badges` (one permanent unlock per volunteer and badge). `carecall_requests.reward_quote_json` stores the 5/10/15-point offer fixed at acceptance. These tables and the nullable column are added automatically when the database is opened; repeated starts preserve existing records and do not backfill historical rewards. Completion, points and badge unlocks commit together. Clearing request history retains rewards; deleting the volunteer account removes them. Monthly progress and streaks are calculated from the ledger using Hong Kong calendar dates. The reward tables are separate from the JSON snapshot: back up the entire SQLite database, not only `carecall_state`.

Render free services use ephemeral filesystems: this local implementation alone does not make cloud data durable across redeploys/restarts. Configure a paid persistent disk with CARECALL_DB_PATH, or migrate to managed PostgreSQL before relying on archived history. No hosting resources were purchased or changed.

Browser location permissions are controlled by the browser and may be revoked. CareCall asks at signup, remembers the browser choice, saves the account preference, and reuses a recent position for up to 10 minutes. There are no coordinate-entry fields; manual map selection remains available. A database is not required to remember browser permission, but is required for durable account preferences and shared history.

Implemented boundaries:

- HttpOnly, SameSite=Strict session cookies; Secure cookies on HTTPS.
- Server-derived identity, role checks, participant-only request/chat APIs, same-origin write checks.
- Only one volunteer can accept a pending request in the single-process demo.
- Public nearby listings show structured category/urgency, coarsened distance and approximate coordinates; no names, phones, transcript or free-text summary.
- Exact request location and redacted description are available only to the matched pair.
- Call sharing and external AI processing default off. Disabling sharing prevents future API access; information already seen cannot be recalled.
- Chat is participant-only (not end-to-end encrypted). Resident completion immediately blocks text/photo writes and calls. Read-only conversations remain visible for seven days from completion, then disappear from list, request and chat APIs while remaining stored. Account centre can delete all completed shared history, including older archives. Disabling chat sharing blocks reads as well.
- Raw audio and original photos are not saved. Re-encoded request/chat photos have EXIF removed and follow the request archive lifecycle. Chat photos are at most 960 pixels and 256 KiB, with at most 20 per conversation. Uploads are limited to 8 MiB and 25 megapixels.
- Volunteers start off shift. The UI and API block shift changes during an accepted assignment. Only residents may confirm completion; afterwards the shift toggle is available again.
- Contact fields are not sent to AI providers. Free text is redacted; faces, speech and visual text within media are not anonymized. Media processing requires explicit account consent.
- Account deletion removes the user's account, sessions, resident requests and related conversations, and closes tasks they accepted.

## Speech and image processing

The resident voice control records audio: tap once to start and again to stop. A spoken-language choice selects English, Mandarin, or Cantonese before the clip is sent. There is no browser dictation.

Optional backend support:

- **Recorded audio:** set `DEEPGRAM_API_KEY` and enable AI processing to transcribe after the resident stops recording. English is `en`, Mandarin is `zh-CN` (or `zh-Hant` when the interface is Traditional Chinese), and Cantonese is `zh-HK`, on Nova-3. Automatic detection is only a fallback, and it can tell English from Mandarin; it cannot select Cantonese. Missing keys, provider errors and empty transcripts are shown honestly as unavailable. An accompanying typed description is used without claiming the recording was transcribed.

Photos are previewed and resized in the browser, then independently validated and re-encoded on the server. Accepted uploads are JPEG, PNG, WebP, HEIC, and HEIF. HEIC and HEIF are converted to JPEG before storage. A request needs typed text or a successful voice transcript. An image is an optional attachment and is not interpreted by a model.

Existing optional adapters:

- `OPENROUTER_API_KEY`: structured text triage.
- Photos are optional request attachments. They are stored with the request and are not sent to a model.
- Model names can be configured in the environment.

Without keys/consent, requests remain usable with a clearly labelled **unassessed** state. The saved urgency is NOT_ASSESSED and the category is OTHER, not HIGH, and not a fabricated model result. An image alone is rejected. Model outputs require validation and human oversight before a real emergency deployment.

## Mobile workflow

Resident navigation separates new requests, request progress and location. The request composer has a text field, a working + attachment button, and a tap-to-record microphone. Location is requested explicitly; the map remains visible without GPS and supports manual selection. Missing location produces an actionable explanation instead of disabling Send. Accepted tasks separate conversation, details and the volunteer route map. Main actions stay visible while long content scrolls inside its panel. The account button opens a sidebar with vertical links to profile, privacy and management pages. Login keeps detailed usage/privacy notes in a disclosure and phone-format examples in the input placeholder.

Priority cards support three labelled levels (red HIGH, amber MEDIUM, green LOW), category and a brief summary. A missing provider or withheld AI consent saves urgency NOT_ASSESSED, shown as unassessed, not HIGH.

## Maps

[Leaflet](https://leafletjs.com/reference.html) uses OpenStreetMap tiles with attribution. There is no map API key. Accepted destinations stay **inside the page**, with optional live foreground location updates. **Start navigation** opens an animated bottom sheet for Apple Maps, Google Maps, AMap or Baidu Maps; provider names follow the selected language. On phones, one tap attempts the installed app and falls back to its store. Android uses package intents; iOS uses a guarded timeout and still needs physical-device verification. Walking/public-transport choices, route plans and turn-by-turn guidance belong to the external app. No in-web route plans or ETAs are provided; the old driving endpoint remains for compatibility but is not called by this UI. See [navigation behavior and limitations](docs/NAVIGATION.md).

Location permission belongs to the device/browser; CareCall's saved location preference is separate. Old local-storage denials do not suppress new signup, Send or Use my location requests, and browser permission queries never overwrite account consent. A fresh GPS denial shows guidance to check both device Location Services and this website's permission. On iPhone, check Settings → Privacy & Security → Location Services → Safari Websites, plus Safari's page menu → Website Settings → Location; then reload and retry. Manual map selection remains available. See [Apple's location guidance](https://support.apple.com/en-ie/102515) and [Safari website settings](https://support.apple.com/en-euro/guide/iphone/iphb01fc3c85/ios).

Privacy controls follow the account role: residents can share their address; volunteers can opt into sharing a recent foreground location with their matched resident during an accepted request. Sharing is off by default; only the latest point is held in server memory for at most one minute, with no route/location history. History entries open an independent summary and read-only conversation inside History. Completed views hide contact fields, coordinates and photos and mask known personal details in text. Chat consent and the seven-day visibility window still apply. Call/chat disclosures are in the linked privacy notice instead of the conversation panel, which reserves more room for messages.

Public OSM tiles and the OSRM demo endpoint are best-effort external services, not production availability guarantees. Follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and configure a production routing provider before deployment.

## Verification

```sh
npm run lint
npm run build
```

With a local server running and a nonempty test-call override configured:

```sh
node --test tests/api.test.mjs
```

Tests default to http://127.0.0.1:47293; set `CARECALL_TEST_URL` for another localhost port. They create and clean up isolated test accounts. Coverage includes concurrent acceptance, ownership, privacy revocation, chat access, expiry cleanup, invalid uploads, actual image resizing and missing-provider behavior.

The browser checks also exercise two separate sessions, three languages, mobile layout, live chat, account settings, in-page maps and intercepted call links. Hardware call connection and live paid AI processing require manual testing with the corresponding device/API keys.

## UI regression checks

Read CARECALL_CHANGELOG.md before changing this app. The log records user constraints and deployment boundaries.

With a local server running, Playwright available to Node (installed locally or through NODE_PATH), and Microsoft Edge installed:

```sh
CARECALL_TEST_URL=http://127.0.0.1:47294 node --test tests/ui-regression.test.mjs
```

These checks cover denied/unavailable/pending GPS, explicit location requests, manual map selection, draft preservation, the + file picker, microphone recording using fake test audio, sidebar navigation, the original palette and inspected tel destinations. No phone calls are placed. External OSM tile loading needs network access and is checked separately from simulated permission scenarios.

## Compared with the teammate's current branch

Baseline verified directly against GitHub on 2026-09-25: [`cursor/neighbourhood-mutual-aid-506d`, commit `14aa2d1015c406da0dbca0351c38f9d04b70f2f2`](https://github.com/liangxuntan/hack4sdg2026/tree/14aa2d1015c406da0dbca0351c38f9d04b70f2f2). The remote hash matched the locally available object. This comparison uses that exact version, not an assumption about the teammate's deployed website. The cursor branch was neither checked out, modified, pulled nor pushed.

The original README is preserved verbatim in [docs/TEAMMATE_README.md](docs/TEAMMATE_README.md), solely as a reference in this CareCall branch.

### Existing work retained and extended

The teammate built the Next.js resident/volunteer foundation, voice/photo submission, Deepgram transcription, OpenRouter/Gemini classification adapters, three urgency levels, four categories, emergency 999 links, nearby matching within 5 km, urgency/distance sorting and polling for acceptance. These are inherited foundations, not newly invented CareCall features. Their source is branded Porchline; the separate hosted site was shared as NeighbourLink.

| Area | Teammate baseline at 14aa2d1 | Current CareCall |
| --- | --- | --- |
| Brand and language | Porchline, English interface | CareCall; English, 繁體中文 and 简体中文 with remembered selection |
| Mobile navigation | Resident and volunteer pages with longer sections | Compact task stages and bottom navigation; History replaces the general Map tab; account sidebar opens dedicated sections; original cream/dark palette retained |
| Request composition | Voice/photo submission and optional provider processing | Text, a working + photo picker and simple tap-to-record microphone; clear submission/acceptance/completion banners; preserves drafts when location fails |
| Location and maps | Browser GPS with displayed coordinates; no map component in the baseline tree | Interactive OpenStreetMap/Leaflet, manual pin fallback, signup location request, remembered preference, no manual coordinate fields; live foreground volunteer position and animated external-map chooser for walking/transit navigation |
| Classification UI | Urgency badge, summary, category and dispatch labels | Category on an urgency-colored card with short summary; existing provider adapters retained; fallback urgency is NOT_ASSESSED when classification is unavailable, not HIGH and not a medical assessment |
| Acceptance | Sets request status to ACCEPTED; resident polls for updates | Server binds the request to one volunteer, prevents duplicate acceptance and exposes matched status to both participants |
| Conversation and calls | Volunteer gets a resident tel link after accepting; no chat API | Participant-only text/photo conversation with call control in its header; current permitted number, device-dialer link and copy fallback; phone sharing defaults off |
| Completion and history | PENDING/ACCEPTED flow | Resident confirms completion; volunteer sees update; text/photo writes and calls stop; seven-day read-only history followed by database archival |
| Volunteer availability | No shift state | On/off shift; acceptance requires being on shift; UI and API lock the shift switch during an active assignment |
| Account | Browser localStorage profile and server in-memory session creation | HttpOnly cookie session, profile editor, optional three-line resident address, vertical account drawer, sign-out and deletion |
| Privacy and API access | Status/accept routes do not enforce participant session checks | Required privacy checkbox with linked notice; per-account name/address/phone/chat/location/AI controls; server role and participant checks, same-origin writes and reduced public-list details |
| Media handling | Existing external speech/image model calls | Re-encoded photos with EXIF removed, file/size validation, bounded chat images and explicit external-processing consent; simple recording UI leaves recognition to backend providers |
| Storage | In-memory users/sessions/requests; restart clears data | Local single-process SQLite. Session, request, and message tables are the runtime source of truth. The JSON snapshot is a backup |
| Deployment and verification | Baseline tracked tree has no Render YAML or Dockerfile; README describes local development | Render configuration, standalone build preparation, Docker support, health endpoint and API/mobile/persistence regression tests |

### Important remaining limits

- Deepgram and OpenRouter need configured keys and account consent. A photo is stored as an attachment and is not classified. Image resizing and EXIF removal work without an LLM. Recording alone does not mean speech was transcribed.
- Calls use the device phone app. CareCall does not yet implement browser VoIP, WebRTC, a PSTN provider, or call recording. No live call was placed during tests.
- Location permission belongs to the browser and can be revoked. Database persistence remembers account preferences; it cannot make browser permission permanent.
- SQLite currently supports one server process. Render's free filesystem is ephemeral, so deploying this code does not guarantee preservation across redeploys or instance replacement. Use a persistent disk or managed database for durable production history.
- Seven days is the UI visibility period measured from completion, not automatic database deletion. Older conversations are retained until a user deletes completed history/account as described above. Production needs an agreed archival retention policy.
- Phone ownership is not verified and lost sessions have no recovery flow. This is not production-grade authentication or emergency dispatch.
- Automated checks cover local behavior, including failure paths. They do not establish Hong Kong/mainland network availability, real telephone connectivity or accuracy of emergency classification.

