import sharp from "sharp";
import { chatImage } from "@/lib/chat-image";
import { triageRequestWithGemini } from "@/lib/ai";
import { triageTextWithOpenRouter } from "@/lib/openrouter";
import { audioContentType, transcribeWithDeepgram } from "@/lib/speech";
import { redact, store, view } from "@/lib/db";
import { currentUser, fail, json, sameOrigin, validCoords } from "@/lib/server";
import type { HelpRequest, TriageFields } from "@/lib/types";
export const runtime = "nodejs";
function upload(value: FormDataEntryValue | null) {
  return value instanceof File && value.size ? value : null;
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  if (user.role !== "resident") return fail("forbidden", 403);
  if (Number(request.headers.get("content-length")) > 18 * 1024 * 1024)
    return fail("fileTooLarge", 413);
  const form = await request.formData().catch(() => null);
  if (!form) return fail("invalidInput");
  if (!form.has("lat") || !form.has("lng")) return fail("locationError");
  const lat = Number(form.get("lat")),
    lng = Number(form.get("lng"));
  if (!validCoords(lat, lng)) return fail("locationError");
  const locale = ["en", "zh-Hant", "zh-Hans"].includes(
    String(form.get("locale")),
  )
    ? String(form.get("locale"))
    : "en";
  const language = ["en", "zh-HK", "zh-CN"].includes(
    String(form.get("language")),
  )
    ? String(form.get("language"))
    : "en";
  const audio = upload(form.get("audio")),
    image = upload(form.get("image"));
  let transcript = String(form.get("text") || "").trim();
  if (transcript.length > 4000) return fail("invalidInput");
  if (!transcript && !audio && !image) return fail("emptyRequest");
  if ([audio, image].some((f) => f && f.size > 8 * 1024 * 1024))
    return fail("fileTooLarge", 413);
  if (
    audio &&
    ![
      "audio/webm",
      "audio/ogg",
      "audio/wav",
      "audio/mpeg",
      "audio/mp4",
      "video/webm",
    ].includes(audioContentType(audio.type))
  )
    return fail("invalidAudio");
  let imageData: string | undefined;
  let imageBuffer: Buffer | undefined,
    imageWidth: number | undefined,
    imageHeight: number | undefined;
  if (image) {
    try {
      const pipeline = sharp(Buffer.from(await image.arrayBuffer()), {
        limitInputPixels: 25000000,
        failOn: "error",
      });
      const meta = await pipeline.metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format || "") ||
        (meta.pages ?? 1) > 1
      )
        return fail("invalidImage");
      const output = await pipeline
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      imageBuffer = output.data;
      imageWidth = output.info.width;
      imageHeight = output.info.height;
      imageData = await chatImage(image);
    } catch {
      return fail("invalidImage");
    }
  }
  const audioBuffer = audio
    ? Buffer.from(await audio.arrayBuffer())
    : undefined;
  let audioStatus: HelpRequest["audioStatus"] = audio ? "unavailable" : "none";
  if (audio && transcript) audioStatus = "provided";
  if (
    audioBuffer &&
    !transcript &&
    user.privacy.allowAI &&
    process.env.DEEPGRAM_API_KEY
  ) {
    try {
      transcript = await transcribeWithDeepgram(
        audioBuffer,
        audio!.type,
        language,
      );
      audioStatus = "transcribed";
    } catch {
      /* Return explicit unavailable status, never fabricate text. */
    }
  }
  const safeText = redact(transcript);
  let triage: TriageFields = {
    urgency_level: "HIGH",
    category: "OTHER",
    summary: safeText || "mediaRequest",
    dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
  };
  let source: HelpRequest["source"] = "fallback",
    imageStatus: HelpRequest["imageStatus"] = image ? "prepared" : "none";
  if (user.privacy.allowAI) {
    if (!imageBuffer && safeText && process.env.OPENROUTER_API_KEY) {
      try {
        triage = await triageTextWithOpenRouter(safeText, locale);
        source = "openrouter";
      } catch {}
    }
    if (source === "fallback" && process.env.GEMINI_API_KEY) {
      try {
        const media: Array<{ buffer: Buffer; mimeType: string }> = [];
        if (imageBuffer)
          media.push({ buffer: imageBuffer, mimeType: "image/jpeg" });
        if (audioBuffer && !transcript)
          media.push({ buffer: audioBuffer, mimeType: audio!.type });
        triage = await triageRequestWithGemini({
          text: safeText,
          media,
          locale,
        });
        source = "gemini";
        if (imageBuffer) imageStatus = "analyzed";
      } catch {}
    }
  }
  triage.summary = redact(triage.summary);
  const saved: HelpRequest = {
    ...triage,
    id: crypto.randomUUID(),
    residentId: user.id,
    lat,
    lng,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    source,
    transcript: safeText || undefined,
    audioStatus,
    imageStatus,
    imageWidth,
    imageHeight,
    imageData,
  };
  store().requests.push(saved);
  return json(view(saved, user), 201);
}
