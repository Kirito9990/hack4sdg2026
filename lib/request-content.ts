export function effectiveRequestText(typed: string, spoken: string) {
  return typed.trim() || spoken.trim();
}

/** The recording stays with the resident, and reaches a volunteer only after they accept. */
export function shareVoiceNote(input: {
  status: string;
  audioData?: string;
  userId: string;
  residentId: string;
  volunteerId?: string;
}) {
  if (!input.audioData || input.status === "CLOSED") return false;
  if (input.userId === input.residentId) return true;
  return input.status === "ACCEPTED" && input.userId === input.volunteerId;
}
