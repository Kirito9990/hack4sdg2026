import { parseTriage, TRIAGE_PROMPT, TRIAGE_SCHEMA } from "@/lib/ai";
export async function triageTextWithOpenRouter(text: string, locale: string) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("Missing text key");
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      signal: AbortSignal.timeout(20000),
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
          { role: "user", content: text },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "triage", strict: true, schema: TRIAGE_SCHEMA },
        },
      }),
    },
  );
  if (!response.ok) throw new Error("Text provider unavailable");
  const result = await response.json();
  return parseTriage(result.choices?.[0]?.message?.content || "");
}
