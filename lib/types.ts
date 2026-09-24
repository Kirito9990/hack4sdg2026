export const URGENCY_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export const CATEGORIES = ["MEDICAL", "NON_MEDICAL", "DEBRIS_MOBILITY", "OTHER"] as const;
export const DISPATCH_ACTIONS = [
  "EMERGENCY_medical",
  "EMERGENCY_nonmedical",
  "NEIGHBORHOOD_VOLUNTEER",
] as const;
export const REQUEST_STATUSES = ["PENDING", "ACCEPTED"] as const;
export const USER_ROLES = ["resident", "volunteer"] as const;

export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];
export type RequestCategory = (typeof CATEGORIES)[number];
export type DispatchAction = (typeof DISPATCH_ACTIONS)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];

export type TriageFields = {
  urgency_level: UrgencyLevel;
  category: RequestCategory;
  summary: string;
  dispatch_action: DispatchAction;
};

export type HelpRequest = TriageFields & {
  id: string;
  residentName: string;
  residentPhone: string;
  lat: number;
  lng: number;
  status: RequestStatus;
  createdAt: string;
  mediaNote?: string;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: string;
};

export type Session = {
  id: string;
  userId: string;
  createdAt: string;
};

export function isUrgencyLevel(value: unknown): value is UrgencyLevel {
  return typeof value === "string" && URGENCY_LEVELS.includes(value as UrgencyLevel);
}

export function isCategory(value: unknown): value is RequestCategory {
  return typeof value === "string" && CATEGORIES.includes(value as RequestCategory);
}

export function isDispatchAction(value: unknown): value is DispatchAction {
  return typeof value === "string" && DISPATCH_ACTIONS.includes(value as DispatchAction);
}

export function isTriageFields(value: unknown): value is TriageFields {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    isUrgencyLevel(record.urgency_level) &&
    isCategory(record.category) &&
    isDispatchAction(record.dispatch_action) &&
    typeof record.summary === "string" &&
    record.summary.trim().length > 0
  );
}

export function fallbackTriage(residentName: string): TriageFields {
  const name = residentName.trim() || "A resident";
  return {
    urgency_level: "HIGH",
    category: "OTHER",
    summary: `${name} sent a distress note that could not be read automatically and needs a neighbour to check in.`,
    dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
  };
}
