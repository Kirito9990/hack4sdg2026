import sharp from "sharp";
import { storedChatImage } from "@/lib/chat-image";
import { rasterizeUpload } from "@/lib/heif-image";
import { triageTextWithOpenRouter } from "@/lib/openrouter";
import { classifyPrepared, prepareAiInput } from "@/lib/pipeline";
import { effectiveRequestText } from "@/lib/request-content";
import { audioContentType, transcribeWithDeepgram } from "@/lib/speech";
import { redact, store, persist, view } from "@/lib/db";
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
    : "auto";
  const audio = upload(form.get("audio")),
    image = upload(form.get("image"));
  const typed = String(form.get("text") || "").trim();
  if (typed.length > 4000) return fail("invalidInput");
  if (!typed && !audio) return fail("emptyRequest");
  let transcript = typed;
  let spoken = "";
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
  let imageWidth: number | undefined,
    imageHeight: number | undefined;
  if (image) {
    try {
      const raster = await rasterizeUpload(
        Buffer.from(await image.arrayBuffer()),
      );
      const pipeline = sharp(raster, {
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
      imageWidth = output.info.width;
      imageHeight = output.info.height;
      imageData = await storedChatImage(raster);
    } catch {
      return fail("invalidImage");
    }
  }
  const audioBuffer = audio
    ? Buffer.from(await audio.arrayBuffer())
    : undefined;
  let audioStatus: HelpRequest["audioStatus"] = audio ? "unavailable" : "none";
  if (audio && typed) audioStatus = "provided";
  if (
    audioBuffer &&
    !typed &&
    user.privacy.allowAI &&
    process.env.DEEPGRAM_API_KEY
  ) {
    try {
      spoken = (
        await transcribeWithDeepgram(audioBuffer, audio!.type, language)
      ).trim();
      transcript = spoken;
      audioStatus = "transcribed";
    } catch {
      /* Return explicit unavailable status, never fabricate text. */
    }
  }
  if (!effectiveRequestText(typed, spoken)) return fail("emptyRequest");
  const safeText = redact(transcript);
  const prepared = prepareAiInput({
    text: redact(typed),
    transcript: spoken && spoken !== typed ? redact(spoken) : "",
    metadata: { locale, audioStatus },
  });
  const assessed = await classifyPrepared(prepared, {
    allowAI: user.privacy.allowAI === true,
    locale,
    classifyText: process.env.OPENROUTER_API_KEY
      ? (text, requestLocale) =>
          triageTextWithOpenRouter(text, requestLocale)
      : undefined,
  });
  const triage: TriageFields = assessed.triage || {
    urgency_level: "NOT_ASSESSED",
    category: "OTHER",
    summary: assessed.classification.summary || safeText || "notAssessed",
    dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
    requirements: [],
    tools: [],
    resources: [],
  };
  const source = assessed.source;
  const imageStatus: HelpRequest["imageStatus"] = image ? "prepared" : "none";
  triage.summary = redact(triage.summary);
  const cleanList = (items: string[] | undefined) =>
    (items || [])
      .map((item) => redact(item).trim())
      .filter((item) => item && !/^\[(contact|name|address) hidden\]$/.test(item));
  triage.requirements = cleanList(triage.requirements);
  triage.tools = cleanList(triage.tools);
  triage.resources = cleanList(triage.resources);
  assessed.classification.summary = triage.summary;
  assessed.classification.urgency = triage.urgency_level;
  assessed.classification.matching_tags = cleanList([
    ...(triage.requirements || []),
    ...(triage.tools || []),
    ...(triage.resources || []),
  ]);
  const saved: HelpRequest = {
    ...triage,
    classification: assessed.classification,
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
  persist();
  return json(view(saved, user), 201);
}
