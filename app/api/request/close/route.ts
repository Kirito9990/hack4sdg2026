import { getRequest, member, store, view } from "@/lib/db";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null),
    found = body && getRequest(body.id);
  if (!found || !member(found, user)) return fail("notFound", 404);
  found.status = "CLOSED";
  const data = store();
  data.messages = data.messages.filter((m) => m.requestId !== found.id);
  return json(view(found, user));
}
