import { emergencyTriage } from "./clarify.ts";
import type { SafetyClassification, TriageFields } from "@/lib/types";

export type PreparedRequest = {
  text: string;
  transcript: string;
  metadata: Record<string, string | boolean>;
};

export function prepareAiInput(input: {
  text: string;
  transcript: string;
  metadata?: Record<string, string | boolean>;
}): PreparedRequest {
  return {
    text: input.text.trim(),
    transcript: input.transcript.trim(),
    metadata: input.metadata || {},
  };
}

export function classificationPacket(prepared: PreparedRequest) {
  const lines: string[] = [];
  if (prepared.text) lines.push("Typed request: " + prepared.text);
  if (prepared.transcript && prepared.transcript !== prepared.text)
    lines.push("Voice transcript: " + prepared.transcript);
  return lines.join("\n");
}

export function notAssessed(summary: string): SafetyClassification {
  return {
    category: "OTHER",
    urgency: "NOT_ASSESSED",
    safety_level: "NEIGHBORHOOD_VOLUNTEER",
    matching_tags: [],
    summary: summary.trim() || "notAssessed",
  };
}

export function classificationFromTriage(
  fields: TriageFields,
): SafetyClassification {
  return {
    category: fields.category,
    urgency: fields.urgency_level,
    safety_level: fields.dispatch_action,
    matching_tags: [
      ...(fields.requirements || []),
      ...(fields.tools || []),
      ...(fields.resources || []),
    ],
    summary: fields.summary,
  };
}

export async function classifyPrepared(
  prepared: PreparedRequest,
  options: {
    allowAI: boolean;
    locale: string;
    classifyText?: (text: string, locale: string) => Promise<TriageFields>;
  },
): Promise<{
  prepared: PreparedRequest;
  classification: SafetyClassification;
  triage?: TriageFields;
  source: "openrouter" | "fallback";
}> {
  const summary = prepared.text || prepared.transcript;
  if (!options.allowAI) {
    return {
      prepared,
      classification: notAssessed(summary),
      source: "fallback",
    };
  }
  const packet = classificationPacket(prepared);
  if (packet && options.classifyText) {
    try {
      const triage = await options.classifyText(packet, options.locale);
      return {
        prepared,
        classification: classificationFromTriage(triage),
        triage,
        source: "openrouter",
      };
    } catch {
      /* A failed text classification stays unassessed, unless it is a clear emergency. */
    }
  }
  const emergency = emergencyTriage(summary);
  if (emergency) {
    return {
      prepared,
      classification: classificationFromTriage(emergency),
      triage: emergency,
      source: "fallback",
    };
  }
  return {
    prepared,
    classification: notAssessed(summary),
    source: "fallback",
  };
}
