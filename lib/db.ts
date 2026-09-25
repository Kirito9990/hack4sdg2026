import type { ChatMessage, HelpRequest, Session, User } from "@/lib/types";
type Store = {
  users: User[];
  sessions: Session[];
  requests: HelpRequest[];
  messages: ChatMessage[];
};
const globalStore = globalThis as typeof globalThis & { __carecallV2?: Store };
export function store(): Store {
  const data = (globalStore.__carecallV2 ??= {
    users: [],
    sessions: [],
    requests: [],
    messages: [],
  });
  const active = new Set(
    data.requests
      .filter(
        (r) =>
          r.status === "ACCEPTED" &&
          Date.parse(r.chatExpiresAt || "") > Date.now(),
      )
      .map((r) => r.id),
  );
  data.messages = data.messages.filter((m) => active.has(m.requestId));
  data.sessions = data.sessions.filter(
    (s) => Date.parse(s.createdAt) + 7 * 86400000 > Date.now(),
  );
  return data;
}
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
export function getRequest(id: string) {
  return store().requests.find((r) => r.id === id);
}
export function member(r: HelpRequest, user: User) {
  return r.residentId === user.id || r.volunteerId === user.id;
}
export function chatOpen(r: HelpRequest) {
  const data = store();
  return (
    r.status === "ACCEPTED" &&
    Date.parse(r.chatExpiresAt || "") > Date.now() &&
    !!data.users.find((u) => u.id === r.residentId)?.privacy.allowChat &&
    !!data.users.find((u) => u.id === r.volunteerId)?.privacy.allowChat
  );
}
export function redact(text: string, people: User[] = store().users) {
  let result = text;
  for (const person of people)
    result = result
      .split(person.phone)
      .join("[contact hidden]")
      .split(person.name)
      .join("[name hidden]");
  return result
    .replace(/\+?\d[\d\s().-]{5,}\d/g, "[contact hidden]")
    .slice(0, 2000);
}
export function view(r: HelpRequest, user: User) {
  const data = store(),
    resident = data.users.find((u) => u.id === r.residentId),
    volunteer = data.users.find((u) => u.id === r.volunteerId);
  const other = user.id === r.residentId ? volunteer : resident;
  const active =
    r.status === "ACCEPTED" && Date.parse(r.chatExpiresAt || "") > Date.now();
  const testPhone = process.env.CARECALL_TEST_CALL_PHONE?.trim();
  const callPhone =
    active && other?.privacy.allowCalls
      ? user.role === "volunteer" && testPhone
        ? testPhone
        : other.phone
      : null;
  return {
    ...r,
    residentName: resident?.name || "",
    volunteerName: volunteer?.name,
    chatAvailable: chatOpen(r),
    callPhone,
    testCall: !!(callPhone && testPhone && user.role === "volunteer"),
  };
}
