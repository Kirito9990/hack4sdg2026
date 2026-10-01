import {loadSnapshot,writeSnapshot} from "./persistence.mjs";
import {historyVisible} from "./retention";
import { sharedLocation } from "./volunteer-location";
import type { ChatMessage, HelpRequest, Session, User } from "@/lib/types";
type Store = {
  users: User[];
  sessions: Session[];
  requests: HelpRequest[];
  messages: ChatMessage[];
};
const globalStore=globalThis as typeof globalThis & {__carecallV3?:Store};
export function store():Store {
 const data=globalStore.__carecallV3 ??= (loadSnapshot() as Store|null)||{users:[],sessions:[],requests:[],messages:[]};
 return data;
}
export function persist(){writeSnapshot(store());}
export function chatReadable(r:HelpRequest){
 const data=store();
 return !!r.volunteerId && historyVisible(r) && !!data.users.find(u=>u.id===r.residentId)?.privacy.allowChat && !!data.users.find(u=>u.id===r.volunteerId)?.privacy.allowChat;
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
  for(const person of people)for(const line of (person.address||"").split(/\r?\n/).filter(Boolean))result=result.split(line).join("[address hidden]");
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
    r.status === "ACCEPTED";
  const closed = r.status === "CLOSED";
  const { lat, lng, transcript, speechTranscript, summary, imageData, ...record } = r;
  const people = [resident, volunteer].filter((person): person is User => !!person);
  const testPhone = process.env.CARECALL_TEST_CALL_PHONE?.trim();
  const callPhone =
    active && other?.privacy.allowCalls
      ? user.role === "volunteer" && testPhone
        ? testPhone
        : other.phone
      : null;
  return {
    ...record,
    ...(closed ? { summary: redact(summary, people), transcript: transcript ? redact(transcript, people) : undefined, imageHidden: !!imageData } : { lat, lng, transcript, summary, imageData }),
    speechTranscript: speechTranscript ? redact(speechTranscript, people) : undefined,
    residentName: !closed && resident && (resident.id===user.id || resident.privacy.showName !== false) ? resident.name : "",
    volunteerName: !closed && volunteer && (volunteer.id===user.id || volunteer.privacy.showName !== false) ? volunteer.name : "",
    residentAddress: !closed && resident && (resident.id===user.id || (active && resident.privacy.shareAddress)) ? resident.address : undefined,
    volunteerLocationSharing: active && volunteer?.privacy.shareLocation === true,
    volunteerLocation: active && user.id === r.residentId && volunteer?.privacy.shareLocation ? sharedLocation(r.id, volunteer.id) : undefined,
    chatReadable: chatReadable(r),
    chatAvailable: chatOpen(r),
    callPhone,
    testCall: !!(callPhone && testPhone && user.role === "volunteer"),
  };
}
