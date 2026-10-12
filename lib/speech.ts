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

const DEEPGRAM_LANGUAGE: Record<string, string> = {
  en: "en",
  zh: "zh",
  "zh-CN": "zh-CN",
  "zh-Hans": "zh-Hans",
  "zh-TW": "zh-TW",
  "zh-Hant": "zh-Hant",
  "zh-HK": "zh-HK",
};

export function spokenToDeepgram(spoken: "en" | "zh" | "yue", locale: string) {
  if (spoken === "yue") return "zh-HK";
  if (spoken === "zh") return locale === "zh-Hant" ? "zh-Hant" : "zh-CN";
  return "en";
}

export function acceptedDeepgramLanguage(value: string) {
  return DEEPGRAM_LANGUAGE[value] ? value : "auto";
}

export function listenSearchParams(language: string) {
  const params = new URLSearchParams();
  params.set("model", process.env.DEEPGRAM_MODEL || "nova-3");
  params.set("smart_format", "true");
  params.set("punctuate", "true");
  const code = DEEPGRAM_LANGUAGE[language];
  if (code) params.set("language", code);
  else {
    // Cantonese is not detectable: detect_language=zh-HK is rejected, and an
    // open detector often labels that speech as English. Callers should send zh-HK.
    params.append("detect_language", "en");
    params.append("detect_language", "zh");
  }
  return params;
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
  for (const [name, value] of listenSearchParams(language))
    url.searchParams.append(name, value);
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
