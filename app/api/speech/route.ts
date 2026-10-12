import {
  acceptedDeepgramLanguage,
  audioContentType,
  transcriptionLanguage,
  transcribeWithDeepgram,
} from "@/lib/speech";
import { redact } from "@/lib/db";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";

export const runtime = "nodejs";

function upload(value: FormDataEntryValue | null) {
  return value instanceof File && value.size ? value : null;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  if (user.role !== "resident") return fail("forbidden", 403);
  if (!user.privacy.allowAI) return fail("speechNeedsConsent", 403);
  if (!process.env.DEEPGRAM_API_KEY) return fail("audioUnavailable");
  if (Number(request.headers.get("content-length")) > 9 * 1024 * 1024)
    return fail("fileTooLarge", 413);
  const form = await request.formData().catch(() => null);
  if (!form) return fail("invalidInput");
  const audio = upload(form.get("audio"));
  if (!audio) return fail("emptyRequest");
  if (audio.size > 8 * 1024 * 1024) return fail("fileTooLarge", 413);
  if (
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
  const locale = String(form.get("locale") || "");
  const language = ["en", "zh-Hant", "zh-Hans"].includes(locale)
    ? transcriptionLanguage(locale)
    : acceptedDeepgramLanguage(String(form.get("language")));
  try {
    const transcript = redact(
      await transcribeWithDeepgram(
        Buffer.from(await audio.arrayBuffer()),
        audio.type,
        language,
      ),
    ).trim();
    if (!transcript) return fail("audioUnavailable");
    return json({ transcript });
  } catch {
    return fail("audioUnavailable");
  }
}
