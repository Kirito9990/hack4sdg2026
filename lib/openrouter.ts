import { parseTriage, TRIAGE_PROMPT, TRIAGE_SCHEMA } from "@/lib/ai";
export async function triageRequestWithOpenRouter(input: {
  text: string;
  locale: string;
}) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("Missing text key");
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      // Some providers send HTTP 200 headers before generating the JSON body.
      // Keep the whole response bounded, with time for free models.
      signal: AbortSignal.timeout(60000),
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL?.trim() || "openrouter/free",
        provider: { require_parameters: true },
        messages: [
          {
            role: "system",
            content: TRIAGE_PROMPT + " Write the summary in " + input.locale + ".",
          },
          {
            role: "user",
            content: input.text,
          },
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
  const parsed = parseTriage(result.choices?.[0]?.message?.content || "");
  const { urgency_level, category, summary, dispatch_action } = parsed;
  // Copy only validated fields; provider output must not add database fields.
  return { urgency_level, category, summary, dispatch_action };
}
