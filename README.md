# Porchline

Neighbourhood mutual aid after a typhoon. A resident records a voice note or photo. A free OpenRouter model classifies the transcript. Life-threatening cases point to **999**. Other requests are offered to volunteers within 5 km.

Requests and sign-ins live in an in-memory store on the Next.js server. Restarting the dev server clears them. There is no login account system and no database.

## Run locally

```bash
npm install
```

Copy `.env.example` to `.env.local` if you do not already have one. Set `DEEPGRAM_API_KEY` so voice notes are transcribed, and `OPENROUTER_API_KEY` so a free model classifies that text. Set `GEMINI_API_KEY` so a photo, or a transcript OpenRouter could not classify, still gets a reading. Leave both model keys blank to exercise the fallback: the request is still saved as high urgency and broadcast to neighbourhood volunteers. If Deepgram returned a transcript, that spoken text is included in the fallback summary.

```bash
npm run dev
```

Open [http://127.0.0.1:47291](http://127.0.0.1:47291). The dev server listens on `0.0.0.0:47291`.

## How a request moves

1. Sign in at `/login` as a resident or a volunteer. The browser stores `user_profile` in localStorage and `POST /api/auth` creates the in-memory user and session.
2. Residents at `/resident` share GPS, then send a `MediaRecorder` voice note (`audio/webm`) or a photo to `POST /api/triage`.
3. A voice note is sent to Deepgram `nova-3` for speech-to-text. OpenRouter model `openrouter/free` then returns urgency, category, summary, and dispatch as JSON. Gemini `gemini-2.5-flash` still classifies a photo, or the audio when transcription fails. If OpenRouter fails, Gemini classifies the transcript instead.
4. If both model keys are missing, or the calls throw, or the JSON does not match the schema, the route still saves the request: `urgency_level` HIGH, `category` OTHER, one sentence that includes the resident name and phone (and the Deepgram transcript when one exists), and `dispatch_action` `NEIGHBORHOOD_VOLUNTEER`. Categories are `MEDICAL`, `NON_MEDICAL`, `MOBILITY`, or `OTHER`.
5. The resident page polls `GET /api/request/status?id=` every 2 seconds. Emergency dispatch shows a call link to 999. Neighbourhood dispatch shows the volunteer broadcast, then “Volunteer en route!” once a volunteer accepts.
6. Volunteers at `/volunteer` share GPS and poll `GET /api/volunteer/tasks?lat=&lng=` every 2.5 seconds. Open tasks inside 5,000 metres are sorted high urgency first, then closest. `POST /api/volunteer/accept` sets status to `ACCEPTED`.
