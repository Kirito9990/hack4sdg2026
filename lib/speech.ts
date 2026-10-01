export function audioContentType(type: string) {
  return type.split(";")[0].trim().toLowerCase();
}
export async function transcribeWithDeepgram(
  audio: Buffer,
  mimeType: string,
  language: string,
) {
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  if (!key) throw new Error("Missing speech key");
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", process.env.DEEPGRAM_MODEL || "nova-3");
  // UI language is not evidence of the spoken language. Keep automatic
  // detection unless the API caller or deployment explicitly supplies one.
  const speechLanguage = language === "auto"
    ? process.env.DEEPGRAM_LANGUAGE?.trim() || "auto"
    : language;
  if (speechLanguage === "auto") url.searchParams.set("detect_language", "true");
  else url.searchParams.set("language", speechLanguage);
  url.searchParams.set("smart_format", "true");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Token " + key,
      "Content-Type": audioContentType(mimeType),
    },
    body: new Uint8Array(audio),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("Speech provider unavailable");
  const result = await response.json(),
    text = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  if (typeof text !== "string" || !text.trim())
    throw new Error("Empty transcript");
  return text.trim().slice(0, 4000);
}
