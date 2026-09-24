type DeepgramListenResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string }>;
    }>;
  };
};

export function audioContentType(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() || "";
  if (base === "audio/webm" || base === "video/webm") return "audio/webm";
  if (base.startsWith("audio/")) return base;
  return "audio/webm";
}

export async function transcribeWithDeepgram(audio: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY is not set");

  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", "nova-3");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("punctuate", "true");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": audioContentType(mimeType),
    },
    body: new Uint8Array(audio),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Deepgram ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }

  const payload = (await response.json()) as DeepgramListenResponse;
  const transcript = payload.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  if (typeof transcript !== "string" || !transcript.trim()) {
    throw new Error("Deepgram returned an empty transcript");
  }
  return transcript.trim();
}
