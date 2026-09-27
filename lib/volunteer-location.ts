import type { SharedLocation } from "./types";

// One recent point, held only in server memory. Never include it in SQLite,
// completed requests or public task lists. Old points expire after one minute.
const state = globalThis as typeof globalThis & {
  __carecallLocations?: Map<string, SharedLocation & { volunteerId: string }>;
};
const locations = () => state.__carecallLocations ??= new Map();
export function clearSharedLocation(requestId: string) { locations().delete(requestId); }
export function clearVolunteerLocations(volunteerId: string) {
  for (const [id, point] of locations()) if (point.volunteerId === volunteerId) locations().delete(id);
}
export function saveSharedLocation(requestId: string, volunteerId: string, point: SharedLocation) {
  for (const [id, stored] of locations()) if (Date.now() - stored.updatedAt >= 60000) locations().delete(id);
  locations().set(requestId, { ...point, volunteerId });
}
export function sharedLocation(requestId: string, volunteerId: string): SharedLocation | undefined {
  const point = locations().get(requestId);
  if (!point || point.volunteerId !== volunteerId) return;
  if (Date.now() - point.updatedAt >= 60000) { clearSharedLocation(requestId); return; }
  const { lat, lng, accuracy, updatedAt } = point;
  return { lat, lng, accuracy, updatedAt };
}
