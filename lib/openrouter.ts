import { parseTriage, TRIAGE_PROMPT, TRIAGE_SCHEMA } from "@/lib/ai";
import {
  clarifyModel,
  clarifyQuestionText,
  clarifySystemPrompt,
  triageModel,
  type ClarifySlot,
} from "@/lib/clarify";
import { openRouterAudioFormat, transcriptInstruction } from "@/lib/speech";

async function requestTriage(text: string, locale: string, key: string) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: triageModel(),
        reasoning: { effort: "none" },
        messages: [
          {
            role: "system",
            content: TRIAGE_PROMPT + " Write the summary in " + locale + ".",
          },
          {
            role: "user",
            content: `The resident said: "${text.trim()}". Return the structured triage.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "triage", strict: true, schema: TRIAGE_SCHEMA },
        },
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`,
    );
  }
  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return parseTriage(result.choices?.[0]?.message?.content || "");
}

export async function clarifyQuestion(input: {
  text: string;
  slot: ClarifySlot;
  locale: string;
}) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key || !input.text.trim()) return null;
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: clarifyModel(),
        reasoning: { effort: "none" },
        temperature: 0.2,
        max_tokens: 80,
        messages: [
          { role: "system", content: clarifySystemPrompt(input.slot, input.locale) },
          { role: "user", content: "Resident text:\n" + input.text.trim().slice(0, 2000) },
        ],
      }),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return clarifyQuestionText(result.choices?.[0]?.message?.content || "");
  } catch {
    return null;
  }
}

export function spokenTranscript(content: string) {
  const text = content
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^(transcript|transcription)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["“”]+|["“”]+$/g, "");
  if (!text || /^(no speech|silence|\[silence\]|empty)$/i.test(text)) return "";
  return text.slice(0, 4000);
}

export async function transcribeWithOpenRouter(
  audio: Buffer,
  mimeType: string,
  language: string,
) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const format = openRouterAudioFormat(mimeType);
  if (!format) throw new Error("Unsupported audio format");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: triageModel(),
      reasoning: { effort: "none" },
      temperature: 0,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "Transcribe the recording exactly in " +
            transcriptInstruction(language) +
            ". Return only the spoken words. Do not translate, label, or explain. If there is no speech, return an empty string.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this recording." },
            {
              type: "input_audio",
              input_audio: { data: audio.toString("base64"), format },
            },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`,
    );
  }
  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = spokenTranscript(result.choices?.[0]?.message?.content || "");
  if (!text) throw new Error("OpenRouter returned an empty transcript");
  return text;
}

export async function triageTextWithOpenRouter(text: string, locale: string) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  try {
    return await requestTriage(text, locale, key);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not set")) throw error;
    return requestTriage(text, locale, key);
  }
}
