import { getRequest, persistRequest, view } from "@/lib/db";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
import { clearSharedLocation } from "@/lib/volunteer-location";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  if (user.role !== "volunteer") return fail("forbidden", 403);
  const body = await request.json().catch(() => null),
    found = body && getRequest(body.id);
  if (!found || found.volunteerId !== user.id) return fail("notFound", 404);
  if (found.status === "CLOSED") return json(view(found, user));
  if (found.status !== "ACCEPTED") return fail("notFound", 404);
  const next = {
    ...found,
    closedReason: "cancelled" as const,
    closedAt: new Date().toISOString(),
    status: "CLOSED" as const,
    chatExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
  persistRequest(next);
  clearSharedLocation(found.id);
  return json(view(next, user));
}
