type DeepgramListenResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string }>;
    }>;
  };
};

export function audioContentType(type: string) {
  return type.split(";")[0]?.trim().toLowerCase() || "";
}

function deepgramContentType(mimeType: string) {
  const base = audioContentType(mimeType);
  if (base === "audio/webm" || base === "video/webm") return "audio/webm";
  if (base.startsWith("audio/")) return base;
  return "audio/webm";
}

export async function transcribeWithDeepgram(
  audio: Buffer,
  mimeType: string,
  language: string,
) {
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", process.env.DEEPGRAM_MODEL || "nova-3");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("punctuate", "true");
  if (language === "auto") url.searchParams.set("detect_language", "true");
  else url.searchParams.set("language", language);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Token " + key,
      "Content-Type": deepgramContentType(mimeType),
    },
    body: new Uint8Array(audio),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Deepgram ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`,
    );
  }
  const result = (await response.json()) as DeepgramListenResponse;
  const text = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  if (typeof text !== "string" || !text.trim())
    throw new Error("Deepgram returned an empty transcript");
  return text.trim().slice(0, 4000);
}
