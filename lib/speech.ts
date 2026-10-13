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

export function messageVoiceLang(locale: string) {
  if (locale === "zh-Hans") return "zh-CN";
  if (locale === "zh-Hant") return "zh-HK";
  return "en";
}

/** Transcription follows the interface language: English, Cantonese for Traditional Chinese, Mandarin for Simplified Chinese. */
export function transcriptionLanguage(locale: string) {
  if (locale === "zh-Hans") return "zh-CN";
  if (locale === "zh-Hant") return "zh-HK";
  return "en";
}

export function spokenToDeepgram(spoken: "en" | "zh" | "yue", locale: string) {
  if (spoken === "yue") return "zh-HK";
  if (spoken === "zh") return locale === "zh-Hant" ? "zh-Hant" : "zh-CN";
  return "en";
}

export function acceptedDeepgramLanguage(value: string) {
  return DEEPGRAM_LANGUAGE[value] ? value : "auto";
}

const OPENROUTER_AUDIO_FORMAT: Record<string, string> = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aiff": "aiff",
  "audio/x-aiff": "aiff",
};

/** Chat audio accepts wav, mp3, ogg, and a few others. Browser webm is converted before upload. */
export function openRouterAudioFormat(mimeType: string) {
  return OPENROUTER_AUDIO_FORMAT[audioContentType(mimeType)] || "";
}

/** The interface language is explicit because an open detector often writes Cantonese as English. */
export function transcriptInstruction(language: string) {
  if (language === "zh-HK" || language === "yue")
    return "Cantonese, written in Traditional Chinese";
  if (language === "zh-Hant" || language === "zh-TW")
    return "Chinese, written in Traditional Chinese";
  if (language === "zh-CN" || language === "zh-Hans" || language === "zh")
    return "Mandarin, written in Simplified Chinese";
  return "English";
}
