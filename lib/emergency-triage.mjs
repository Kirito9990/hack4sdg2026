const MEDICAL_EMERGENCY =
  /\b(?:breath(?:e|ing)?|bleed(?:ing)?|unconscious)\b|不能呼吸|唔夠氣|唔够气|流血|昏迷/i;

const HAZARD_EMERGENCY =
  /\b(?:fire|flood|collapse)\b|火災|火灾|火燭|火烛|水浸|倒塌/i;

const EMERGENCY = new RegExp(
  `${MEDICAL_EMERGENCY.source}|${HAZARD_EMERGENCY.source}`,
  "i",
);

export function isEmergencyText(text) {
  return EMERGENCY.test(String(text || ""));
}

/** A clear emergency is not a neighbour errand, so it is not held for follow-up questions. */
export function emergencyTriage(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value || !EMERGENCY.test(value)) return null;
  const medical = MEDICAL_EMERGENCY.test(value);
  return {
    urgency_level: "HIGH",
    category: medical ? "MEDICAL" : "NON_MEDICAL",
    summary: value.slice(0, 400),
    dispatch_action: medical ? "EMERGENCY_medical" : "EMERGENCY_nonmedical",
    requirements: [],
    tools: [],
    resources: [],
  };
}
