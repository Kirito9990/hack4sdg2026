function normalizeTriage(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const words = (entry: unknown) => (typeof entry === "string" ? entry.trim().toLowerCase().replace(/[\s-]+/g, "_") : "");
  const category = words(record.category).replace("nonmedical", "non_medical").toUpperCase();
  const dispatch = words(record.dispatch_action);
  const dispatchAction = dispatch.includes("nonmedical") || dispatch.includes("non_medical")
    ? "EMERGENCY_nonmedical"
    : dispatch.includes("medical")
      ? "EMERGENCY_medical"
      : dispatch.includes("volunteer") || dispatch.includes("neighbour") || dispatch.includes("neighbor")
        ? "NEIGHBORHOOD_VOLUNTEER"
        : record.dispatch_action;
  return {
    urgency_level: words(record.urgency_level).toUpperCase(),
    category,
    summary: record.summary,
    dispatch_action: dispatchAction,
  };
}

function parseModelJson(text: string | undefined): unknown {
  const raw = (text ?? "").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/\{[\s\S]*\}/);
    if (!fenced) return {};
    try {
      return JSON.parse(fenced[0]);
    } catch {
      return {};
    }
  }
}

const TRIAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    urgency_level: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    category: { type: "string", enum: ["MEDICAL", "NON_MEDICAL", "MOBILITY", "OTHER"] },
    summary: {
      type: "string",
      description: "One sentence that includes the resident name, phone number, and the specific issue",
    },
    dispatch_action: {
      type: "string",
      enum: ["EMERGENCY_medical", "EMERGENCY_nonmedical", "NEIGHBORHOOD_VOLUNTEER"],
    },
  },
  required: ["urgency_level", "category", "summary", "dispatch_action"],
};

export async function triageTextWithOpenRouter(transcript: string, residentName: string, residentPhone: string) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [
        {
          role: "system",
          content:
            "You triage post-typhoon neighbourhood help requests. Use EMERGENCY_medical only for life-threatening medical problems such as not breathing, bleeding, or unconsciousness. Use EMERGENCY_nonmedical only for fire, flood, or structural collapse. Difficulty walking or using stairs is MOBILITY and NEIGHBORHOOD_VOLUNTEER, not an emergency. A leaking roof without fire or collapse is NON_MEDICAL or MOBILITY and NEIGHBORHOOD_VOLUNTEER. HIGH means act now, MEDIUM means a neighbour should come soon, LOW means it can wait.",
        },
        {
          role: "user",
          content: `Resident "${residentName}", phone ${residentPhone}, said: "${transcript.trim()}". Return the structured triage. The summary must be one sentence that includes the resident name and phone.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "triage", strict: true, schema: TRIAGE_SCHEMA },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenRouter ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return normalizeTriage(parseModelJson(payload.choices?.[0]?.message?.content));
}
