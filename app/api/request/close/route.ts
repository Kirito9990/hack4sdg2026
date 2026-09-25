import { getRequest, member, persist, view } from "@/lib/db";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null),
    found = body && getRequest(body.id);
  if (!found || !member(found, user)) return fail("notFound", 404);
  if (found.residentId !== user.id) return fail("residentOnlyFinish", 403);
  if (found.status === "CLOSED") return json(view(found, user));
  found.closedReason = found.status === "ACCEPTED" ? "completed" : "cancelled";
  found.closedAt = new Date().toISOString();
  found.status = "CLOSED";
  found.chatExpiresAt = new Date(Date.now()+7*86400000).toISOString();
  persist();
  return json(view(found, user));
}
