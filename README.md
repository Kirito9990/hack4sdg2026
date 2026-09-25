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
5. “Call resident” opens a `tel:` link in the device's dialer. It does **not** create a browser VoIP call. A capable phone or configured desktop calling app is needed. No calls are made automatically.
6. If `CARECALL_TEST_CALL_PHONE` is set in the server environment, volunteer-to-resident calls use that test destination. The UI labels it, the resident's stored number stays unchanged, and emergency calling still uses `NEXT_PUBLIC_EMERGENCY_NUMBER` (999 by default). Clear the override to call the real resident.
7. Account centre controls call sharing, chat and external AI processing. Residents confirm completed help (or cancel a pending request); the volunteer sees the updated status. Completion deletes the conversation for both participants.

The local test override is in ignored `.env.local`, not the committed example.

## Storage, identity and privacy

This version has a **Next.js API backend but no database**. It works across browsers connected to the **same server process**. Users, random session tokens, requests, matches and messages live in server memory; restarting clears them. Sessions expire after seven days. Logging out ends access to that demo session; entering the same name/number creates a new demo account, not a verified recovery flow.

A production service needs a database (for example PostgreSQL), verified sign-in such as phone OTP, durable session storage, database transactions for acceptance, and scheduled deletion of expired messages. Multiple server instances cannot share this in-memory store. Current signup does not verify ownership of a phone number and must not be treated as production authentication.

Implemented boundaries:

- HttpOnly, SameSite=Strict session cookies; Secure cookies on HTTPS.
- Server-derived identity, role checks, participant-only request/chat APIs, same-origin write checks.
- Only one volunteer can accept a pending request in the single-process demo.
- Public nearby listings show structured category/urgency, coarsened distance and approximate coordinates; no names, phones, transcript or free-text summary.
- Exact request location and redacted description are available only to the matched pair.
- Call sharing and external AI processing default off. Disabling sharing prevents future API access; information already seen cannot be recalled.
- Chat is participant-only (not end-to-end encrypted). It expires 24 hours after acceptance or when the resident closes the request. Expired content is purged on store access; closed content is deleted immediately. Disabling chat pauses access but does not delete it until closure/expiry.
- Raw audio and original photos are not saved. Request photos are re-encoded without EXIF and kept in memory for the matched pair until closure or 24 hours after submission (purged on access). Chat photos follow conversation expiry/closure. Shared copies are at most 960 pixels and 256 KiB, with at most 20 photos per conversation. Original uploads are limited to 8 MiB and 25 megapixels.
- Volunteers start off shift. The server rejects new acceptance while off shift; existing tasks and conversations remain available. Only residents may confirm task completion.
- Contact fields are not sent to AI providers. Free text is redacted; faces, speech and visual text within media are not anonymized. Media processing requires explicit account consent.
- Account deletion removes the user's account, sessions, resident requests and related conversations, and closes tasks they accepted.

## Speech and image processing

There are two speech paths:

- **Browser dictation:** optional, explicit consent, Cantonese/Mandarin/English selection, and editable text. Browser support varies and the browser may use an external speech service. Failure leaves typing and recording available. See [Web Speech documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).
- **Recorded audio:** set `DEEPGRAM_API_KEY` and enable AI processing to transcribe on submission. Language is passed explicitly. Missing keys, provider errors and empty transcripts are shown honestly as unavailable. An accompanying typed description is used without claiming the recording was transcribed.

Photos are previewed and resized in the browser, then independently validated and re-encoded on the server. Scene understanding is best handled by the future multimodal model, rather than pretending OCR alone can interpret a hazard.

Existing optional adapters:

- `OPENROUTER_API_KEY`: structured text triage.
- `GEMINI_API_KEY`: image/audio/text interpretation. Both attachments are supplied when needed; photos are not silently dropped when a transcript exists.
- Model names can be configured in the environment.

Without keys/consent, requests remain usable with a clearly labelled **unassessed / priority human review** state (internal HIGH/OTHER), not a fabricated model result. A recording/photo alone may have no actionable description until a provider is configured; add typed text for the local demo. Model outputs require validation and human oversight before a real emergency deployment.

## Mobile workflow

Resident navigation separates new requests, request progress and location. The two-step request composer has text/photo/voice tabs and a review step. Accepted tasks separate conversation, details and the volunteer route map. Main actions stay visible while long content scrolls inside its panel. Account settings use profile/privacy/manage tabs.

Priority cards support three labelled levels (red HIGH, amber MEDIUM, green LOW), category and a brief summary. Missing-provider fallback stays HIGH/OTHER and explicitly awaits assessment.

## Maps

[Leaflet](https://leafletjs.com/reference.html) uses OpenStreetMap tiles with attribution. There is no map API key. Accepted destinations stay **inside the page**. Clicking “Show driving route here” sends start/end coordinates to the server, which requests an OSRM driving route and draws it on the existing map. It is a driving estimate, not walking guidance; it does not include road closures or storm damage. Routing failure keeps the destination map and chat usable.

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
