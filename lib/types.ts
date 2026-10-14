export type UserRole = "resident" | "volunteer";
export type Locale = "en" | "zh-Hant" | "zh-Hans";
export type UrgencyLevel = "HIGH" | "MEDIUM" | "LOW" | "NOT_ASSESSED";
export type RequestCategory = "MEDICAL" | "NON_MEDICAL" | "MOBILITY" | "OTHER";
export type DispatchAction =
  "EMERGENCY_medical" | "EMERGENCY_nonmedical" | "NEIGHBORHOOD_VOLUNTEER";
export function volunteerCanReceive(request: {
  dispatch_action: string;
  category?: string;
}) {
  return (
    request.dispatch_action === "NEIGHBORHOOD_VOLUNTEER" ||
    request.dispatch_action === "EMERGENCY_medical" ||
    request.category === "MEDICAL"
  );
}
export type RequestStatus = "PENDING" | "ACCEPTED" | "CLOSED";
export type AiChoice = "allow" | "decline";
export type Privacy = {
  allowCalls: boolean;
  allowAI: boolean;
  allowChat: boolean;
  showName?: boolean;
  shareAddress?: boolean;
  shareLocation?: boolean;
  allowLocation?: boolean;
  /** Explicit choice. Absent on older accounts, including those created with allowAI already true. */
  aiChoice?: AiChoice;
  /** Set only when the person chooses. Never backfilled from a historical default. */
  aiChoiceAt?: string;
  aiNoticeVersion?: string;
};
export type User = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  available?: boolean;
  address?: string;
  privacyAcceptedAt?: string;
  privacy: Privacy;
  passwordHash?: string;
  createdAt: string;
};
export type Session = {
  id: string;
  userId: string;
  createdAt: string;
  passwordAuth?: boolean;
};
export type SafetyClassification = {
  category: string;
  urgency: string;
  safety_level: string;
  matching_tags: string[];
  summary: string;
};
export type TriageFields = {
  urgency_level: UrgencyLevel;
  category: RequestCategory;
  summary: string;
  dispatch_action: DispatchAction;
  requirements?: string[];
  tools?: string[];
  resources?: string[];
};
export type HelpRequest = TriageFields & {
  rewardQuote?: import("./rewards").RewardQuote;
  id: string;
  residentId: string;
  volunteerId?: string;
  lat: number;
  lng: number;
  status: RequestStatus;
  createdAt: string;
  acceptedAt?: string;
  chatExpiresAt?: string;
  closedAt?: string;
  closedReason?: "completed" | "cancelled";
  imageData?: string;
  transcript?: string;
  source: "openrouter" | "gemini" | "fallback";
  classification?: SafetyClassification;
  audioStatus: "none" | "transcribed" | "provided" | "unavailable";
  audioData?: string;
  imageStatus: "none" | "prepared" | "analyzed";
  imageWidth?: number;
  imageHeight?: number;
};
export type ChatMessage = {
  id: string;
  requestId: string;
  senderId: string;
  text: string;
  imageData?: string;
  imageHidden?: boolean;
  createdAt: string;
};
export type SharedLocation = { lat: number; lng: number; accuracy: number; updatedAt: number };
export type RequestView = Omit<HelpRequest, "lat" | "lng"> & {
  rewardEarnedPoints?: number;
  lat?: number;
  lng?: number;
  imageHidden?: boolean;
  audioHidden?: boolean;
  volunteerLocationSharing?: boolean;
  volunteerLocation?: SharedLocation;
  residentName: string;
  volunteerName?: string;
  chatAvailable: boolean;
  chatReadable: boolean;
  residentAddress?: string;
  callPhone: string | null;
  testCall: boolean;
  distanceMeters?: number;
  friendStatus?: "none" | "outgoing" | "incoming" | "friends" | "declined";
  friendshipId?: string;
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
