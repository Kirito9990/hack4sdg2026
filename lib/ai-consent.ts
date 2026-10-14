import type { Privacy } from "@/lib/types";

/** Wording shown for the current AI choice. A mismatch means the person must choose again. */
export const AI_NOTICE_VERSION = "2026-10-15-openrouter-v1";

export type AiChoice = "allow" | "decline";

export function aiProcessingAllowed(privacy?: Privacy | null) {
  if (!privacy) return false;
  return (
    privacy.allowAI === true &&
    privacy.aiChoice === "allow" &&
    typeof privacy.aiChoiceAt === "string" &&
    privacy.aiChoiceAt.length > 0 &&
    privacy.aiNoticeVersion === AI_NOTICE_VERSION
  );
}

/** True until this notice version has an explicit allow or decline and a real choice time. */
export function needsAiChoice(privacy?: Privacy | null) {
  if (!privacy) return true;
  if (privacy.aiChoice !== "allow" && privacy.aiChoice !== "decline") return true;
  if (typeof privacy.aiChoiceAt !== "string" || privacy.aiChoiceAt.length === 0) return true;
  return privacy.aiNoticeVersion !== AI_NOTICE_VERSION;
}

export function applyAiChoice(privacy: Privacy, choice: AiChoice, at = new Date().toISOString()): Privacy {
  return {
    ...privacy,
    allowAI: choice === "allow",
    aiChoice: choice,
    aiChoiceAt: at,
    aiNoticeVersion: AI_NOTICE_VERSION,
  };
}
