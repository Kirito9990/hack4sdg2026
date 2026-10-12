import { parseTriage, TRIAGE_PROMPT, TRIAGE_SCHEMA } from "@/lib/ai";
import { clarifyModel, clarifyQuestionText, clarifySystemPrompt, type ClarifySlot } from "@/lib/clarify";

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
        model: process.env.OPENROUTER_MODEL || "openrouter/free",
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
  attempt?: number;
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
        temperature: 0.2,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content: clarifySystemPrompt(input.slot, input.locale, input.attempt || 1),
          },
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
