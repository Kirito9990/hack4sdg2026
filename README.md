# Porchline

Neighbourhood mutual aid after a typhoon. A resident records a voice note or photo. Gemini classifies the urgency. Life-threatening cases point to **999**. Other requests are offered to volunteers within 5 km.

Requests and sign-ins live in an in-memory store on the Next.js server. Restarting the dev server clears them. There is no login account system and no database.

## Run locally

```bash
npm install
```

Copy `.env.example` to `.env.local` if you do not already have one. Set `GEMINI_API_KEY` to a Google AI Studio key. Leave it blank to exercise the fallback: the request is still saved as high urgency and broadcast to neighbourhood volunteers.

```bash
npm run dev
```

Open [http://127.0.0.1:47291](http://127.0.0.1:47291). The dev server listens on `0.0.0.0:47291`.

## How a request moves

1. Sign in at `/login` as a resident or a volunteer. The browser stores `user_profile` in localStorage and `POST /api/auth` creates the in-memory user and session.
2. Residents at `/resident` share GPS, then send a `MediaRecorder` voice note (`audio/webm`) or a photo to `POST /api/triage`.
3. With a key, Gemini `gemini-2.5-flash` reads the audio or image directly and returns urgency, category, summary, and a dispatch action.
4. If `GEMINI_API_KEY` is missing, or the call throws, or the JSON does not match the schema, the route still saves the request: `urgency_level` HIGH, `category` OTHER, one sentence that includes the resident name and phone, and `dispatch_action` `NEIGHBORHOOD_VOLUNTEER`. Categories are `MEDICAL`, `NON_MEDICAL`, `MOBILITY`, or `OTHER`.
5. The resident page polls `GET /api/request/status?id=` every 2 seconds. Emergency dispatch shows a call link to 999. Neighbourhood dispatch shows the volunteer broadcast, then “Volunteer en route!” once a volunteer accepts.
6. Volunteers at `/volunteer` share GPS and poll `GET /api/volunteer/tasks?lat=&lng=` every 2.5 seconds. Open tasks inside 5,000 metres are sorted high urgency first, then closest. `POST /api/volunteer/accept` sets status to `ACCEPTED`.
