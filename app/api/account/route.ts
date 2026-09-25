import { cookies } from "next/headers";
import { store, persist } from "@/lib/db";
import {
  COOKIE,
  currentUser,
  fail,
  json,
  normalizePhone,
  sameOrigin,
  validPhone,
} from "@/lib/server";
export const runtime = "nodejs";
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    body.name.trim().length < 2 ||
    body.name.length > 80
  )
    return fail("invalidName");
  const phone = normalizePhone(
    typeof body.phone === "string" ? body.phone : "",
  );
  if (!validPhone(phone)) return fail("invalidPhone");
  if (
    !body.privacy ||
    ["allowCalls", "allowAI", "allowChat"].some(
      (k) => typeof body.privacy[k] !== "boolean",
    )
  )
    return fail("invalidInput");
  if(body.address!==undefined && (typeof body.address!=="string" || body.address.length>450 || body.address.split(/\r?\n/).length>3))return fail("invalidAddress");
  for(const key of ["showName","shareAddress","allowLocation"])if(body.privacy[key]!==undefined && typeof body.privacy[key]!=="boolean")return fail("invalidInput");
  if(body.address!==undefined)user.address=body.address.trim();
  user.name = body.name.trim();
  user.phone = phone;
  user.privacy = {
    allowCalls: body.privacy.allowCalls,
    allowAI: body.privacy.allowAI,
    allowChat: body.privacy.allowChat,
    showName: body.privacy.showName ?? user.privacy.showName ?? false,
    shareAddress: body.privacy.shareAddress ?? user.privacy.shareAddress ?? false,
    allowLocation: body.privacy.allowLocation ?? user.privacy.allowLocation ?? false,
  };
  persist();
  return json({ user });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const data = store(),
    own = new Set(
      data.requests
        .filter((r) => r.residentId === user.id || r.volunteerId === user.id)
        .map((r) => r.id),
    );
  data.messages = data.messages.filter((m) => !own.has(m.requestId));
  data.requests = data.requests.filter((r) => r.residentId !== user.id);
  data.requests
    .filter((r) => r.volunteerId === user.id)
    .forEach((r) => {
      r.status = "CLOSED";
      r.closedAt=new Date().toISOString();
      r.volunteerId = undefined;
    });
  data.sessions = data.sessions.filter((s) => s.userId !== user.id);
  data.users = data.users.filter((u) => u.id !== user.id);
  persist();
  (await cookies()).delete(COOKIE);
  return json({ ok: true });
}
