import type { DispatchAction, RequestCategory, UrgencyLevel } from "@/lib/types";

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "distance unknown";
  const rounded = Math.max(0, Math.round(meters));
  if (rounded < 1000) return `${rounded}m away`;
  return `${(rounded / 1000).toFixed(1)} km away`;
}

export function urgencyLabel(level: UrgencyLevel): string {
  if (level === "HIGH") return "High";
  if (level === "MEDIUM") return "Medium";
  return "Low";
}

export function categoryLabel(category: RequestCategory): string {
  if (category === "MEDICAL") return "Medical";
  if (category === "NON_MEDICAL") return "Shelter or supplies";
  if (category === "MOBILITY") return "Mobility";
  return "Other";
}

export function dispatchLabel(action: DispatchAction): string {
  if (action === "EMERGENCY_medical") return "Emergency medical — resident was told to call 999";
  if (action === "EMERGENCY_nonmedical") return "Emergency, non-medical — resident was told to call 999";
  return "Neighbourhood volunteer";
}

export function formatAge(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(delta) || delta < 0) return "just now";
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}
