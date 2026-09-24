import { triageRequestWithGemini } from "@/lib/ai";
import { createRequest } from "@/lib/db";
import { ensureContactSummary, fallbackTriage, isTriageFields, type TriageFields } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

function asUpload(entry: FormDataEntryValue | null): File | null {
  if (!entry || typeof entry === "string" || entry.size <= 0) return null;
  return entry;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the request as form data." }, { status: 400 });
  }

  const residentName = String(form.get("residentName") ?? "").trim();
  const residentPhone = String(form.get("residentPhone") ?? "").trim();
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));

  if (residentName.length < 2) {
    return NextResponse.json({ error: "A resident name is required." }, { status: 400 });
  }
  if (!/^[0-9+().\-\s]{6,20}$/.test(residentPhone)) {
    return NextResponse.json({ error: "A reachable phone number is required." }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "A valid location is required." }, { status: 400 });
  }

  const audio = asUpload(form.get("audio"));
  const image = asUpload(form.get("image"));
  const media = audio ?? image;
  if (!media) {
    return NextResponse.json(
      { error: "Attach a voice note or a photo so neighbours know what you need." },
      { status: 400 },
    );
  }
  if (media.size > MAX_MEDIA_BYTES) {
    return NextResponse.json({ error: "That file is larger than 8 MB. Send a shorter note or a smaller photo." }, { status: 413 });
  }

  const mediaNote = [
    audio ? `audio:${audio.type || "audio/webm"}` : null,
    image ? `image:${image.type || "image"}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  let triage: TriageFields = fallbackTriage(residentName, residentPhone);
  let source: "gemini" | "fallback" = "fallback";
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (apiKey) {
    try {
      const buffer = Buffer.from(await media.arrayBuffer());
      const mimeType = media.type || (audio ? "audio/webm" : "image/jpeg");
      const parsed = await triageRequestWithGemini(buffer, mimeType, residentName, residentPhone);
      if (isTriageFields(parsed)) {
        triage = {
          urgency_level: parsed.urgency_level,
          category: parsed.category,
          summary: ensureContactSummary(parsed.summary, residentName, residentPhone),
          dispatch_action: parsed.dispatch_action,
        };
        source = "gemini";
      }
    } catch (error) {
      console.error("Gemini triage failed; using neighbourhood fallback.", error);
    }
  }

  const saved = createRequest({
    residentName,
    residentPhone,
    lat,
    lng,
    mediaNote,
    ...triage,
  });

  return NextResponse.json({
    id: saved.id,
    urgency_level: saved.urgency_level,
    category: saved.category,
    summary: saved.summary,
    dispatch_action: saved.dispatch_action,
    status: saved.status,
    source,
    request: saved,
  });
}
