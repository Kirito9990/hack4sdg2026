export const CLARIFY_LIMIT = 2;
export const CLARIFY_PROMPTS = ["clarifyWhat", "clarifyWhen"] as const;

const CLASSIFIED = new Set(["HIGH", "MEDIUM", "LOW"]);

export function isClassified(urgency: string) {
  return CLASSIFIED.has(urgency);
}

/** Hold the save only when the resident asked to clarify and AI was allowed to run. */
export function holdForClarification(input: {
  clarify: boolean;
  allowAI: boolean;
  urgency: string;
}) {
  return input.clarify && input.allowAI && !isClassified(input.urgency);
}

export function clarifiedText(original: string, answers: string[]) {
  return [original, ...answers]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);
}
