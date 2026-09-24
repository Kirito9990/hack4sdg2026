import type { HelpRequest, Session, TriageFields, User, UserRole } from "@/lib/types";

type Store = {
  users: User[];
  sessions: Session[];
  requests: HelpRequest[];
};

const globalStore = globalThis as typeof globalThis & {
  __porchlineStore?: Store;
};

function store(): Store {
  if (!globalStore.__porchlineStore) {
    globalStore.__porchlineStore = { users: [], sessions: [], requests: [] };
  }
  return globalStore.__porchlineStore;
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function createUser(input: { name: string; phone: string; role: UserRole }): User {
  const user: User = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  store().users.push(user);
  return { ...user };
}

export function createSession(userId: string): Session {
  const session: Session = {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
  };
  store().sessions.push(session);
  return { ...session };
}

export function createRequest(
  input: TriageFields & {
    residentName: string;
    residentPhone: string;
    lat: number;
    lng: number;
    mediaNote?: string;
  },
): HelpRequest {
  const request: HelpRequest = {
    id: crypto.randomUUID(),
    residentName: input.residentName.trim(),
    residentPhone: input.residentPhone.trim(),
    lat: input.lat,
    lng: input.lng,
    urgency_level: input.urgency_level,
    category: input.category,
    summary: input.summary.trim(),
    dispatch_action: input.dispatch_action,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    mediaNote: input.mediaNote,
  };
  store().requests.push(request);
  return { ...request };
}

export function listRequests(): HelpRequest[] {
  return store().requests.map((request) => ({ ...request }));
}

export function getRequest(id: string): HelpRequest | null {
  const found = store().requests.find((request) => request.id === id);
  return found ? { ...found } : null;
}

export function acceptRequest(id: string): HelpRequest | null {
  const found = store().requests.find((request) => request.id === id);
  if (!found) return null;
  found.status = "ACCEPTED";
  return { ...found };
}
