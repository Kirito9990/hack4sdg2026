import {store,persist} from "@/lib/db";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  if (user.role !== "volunteer") return fail("forbidden", 403);
  const body = await request.json().catch(() => null);
  if (typeof body?.available !== "boolean") return fail("invalidInput");
  if(store().requests.some(r=>r.volunteerId===user.id && r.status==="ACCEPTED"))return fail("shiftLocked",409);
  user.available = body.available;
  persist();
  return json({ user });
}
