import type { SafetyClassification, TriageFields } from "@/lib/types";

export type PreparedRequest = {
  text: string;
  transcript: string;
  image_description: string;
  has_image: boolean;
  metadata: Record<string, string | boolean>;
};

export function prepareAiInput(input: {
  text: string;
  transcript: string;
  hasImage: boolean;
  metadata?: Record<string, string | boolean>;
}): PreparedRequest {
  return {
    text: input.text.trim(),
    transcript: input.transcript.trim(),
    image_description: "",
    has_image: input.hasImage,
    metadata: input.metadata || {},
  };
}

export function classificationPacket(prepared: PreparedRequest) {
  const lines: string[] = [];
  if (prepared.text) lines.push("Typed request: " + prepared.text);
  if (prepared.transcript && prepared.transcript !== prepared.text)
    lines.push("Voice transcript: " + prepared.transcript);
  if (prepared.image_description)
    lines.push("Image description: " + prepared.image_description);
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
    describeImage?: () => Promise<string>;
    classifyText?: (text: string, locale: string) => Promise<TriageFields>;
    classifyFallback?: (text: string, locale: string) => Promise<TriageFields>;
  },
): Promise<{
  prepared: PreparedRequest;
  classification: SafetyClassification;
  triage?: TriageFields;
  source: "openrouter" | "gemini" | "fallback";
  imageAnalyzed: boolean;
}> {
  const summary = prepared.text || prepared.transcript;
  if (!options.allowAI) {
    return {
      prepared,
      classification: notAssessed(summary),
      source: "fallback",
      imageAnalyzed: false,
    };
  }
  let imageAnalyzed = false;
  if (prepared.has_image && options.describeImage) {
    try {
      const description = (await options.describeImage()).trim();
      if (description) {
        prepared.image_description = description.slice(0, 1000);
        imageAnalyzed = true;
      }
    } catch {
      /* A missing description does not skip text classification. */
    }
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
        imageAnalyzed,
      };
    } catch {
      /* The text classifier can fail closed into the next provider. */
    }
  }
  if (packet && options.classifyFallback) {
    try {
      const triage = await options.classifyFallback(packet, options.locale);
      return {
        prepared,
        classification: classificationFromTriage(triage),
        triage,
        source: "gemini",
        imageAnalyzed,
      };
    } catch {
      /* Both classifiers failed. */
    }
  }
  return {
    prepared,
    classification: notAssessed(summary),
    source: "fallback",
    imageAnalyzed,
  };
}
