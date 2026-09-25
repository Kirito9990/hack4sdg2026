export type UserRole = "resident" | "volunteer";
export type Locale = "en" | "zh-Hant" | "zh-Hans";
export type UrgencyLevel = "HIGH" | "MEDIUM" | "LOW";
export type RequestCategory = "MEDICAL" | "NON_MEDICAL" | "MOBILITY" | "OTHER";
export type DispatchAction =
  "EMERGENCY_medical" | "EMERGENCY_nonmedical" | "NEIGHBORHOOD_VOLUNTEER";
export type RequestStatus = "PENDING" | "ACCEPTED" | "CLOSED";
export type Privacy = {
  allowCalls: boolean;
  allowAI: boolean;
  allowChat: boolean;
};
export type User = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  privacy: Privacy;
  createdAt: string;
};
export type Session = { id: string; userId: string; createdAt: string };
export type TriageFields = {
  urgency_level: UrgencyLevel;
  category: RequestCategory;
  summary: string;
  dispatch_action: DispatchAction;
};
export type HelpRequest = TriageFields & {
  id: string;
  residentId: string;
  volunteerId?: string;
  lat: number;
  lng: number;
  status: RequestStatus;
  createdAt: string;
  acceptedAt?: string;
  chatExpiresAt?: string;
  transcript?: string;
  source: "openrouter" | "gemini" | "fallback";
  audioStatus: "none" | "transcribed" | "provided" | "unavailable";
  imageStatus: "none" | "prepared" | "analyzed";
  imageWidth?: number;
  imageHeight?: number;
};
export type ChatMessage = {
  id: string;
  requestId: string;
  senderId: string;
  text: string;
  createdAt: string;
};
export type RequestView = HelpRequest & {
  residentName: string;
  volunteerName?: string;
  chatAvailable: boolean;
  callPhone: string | null;
  testCall: boolean;
  distanceMeters?: number;
};
export function isTriageFields(value: unknown): value is TriageFields {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    ["HIGH", "MEDIUM", "LOW"].includes(String(r.urgency_level)) &&
    ["MEDICAL", "NON_MEDICAL", "MOBILITY", "OTHER"].includes(
      String(r.category),
    ) &&
    [
      "EMERGENCY_medical",
      "EMERGENCY_nonmedical",
      "NEIGHBORHOOD_VOLUNTEER",
    ].includes(String(r.dispatch_action)) &&
    typeof r.summary === "string" &&
    r.summary.trim().length > 0
  );
}
