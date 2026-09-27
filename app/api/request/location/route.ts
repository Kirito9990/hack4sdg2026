import { getRequest } from "@/lib/db";
import { currentUser, fail, json, sameOrigin, validCoords } from "@/lib/server";
import { clearSharedLocation, saveSharedLocation } from "@/lib/volunteer-location";
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null);
  const found = typeof body?.id === "string" && getRequest(body.id);
  if (!found || user.role !== "volunteer" || found.volunteerId !== user.id) return fail("notFound", 404);
  if (found.status !== "ACCEPTED" || !user.privacy.shareLocation) return fail("forbidden", 403);
  const now = Date.now();
  if (!validCoords(body.lat, body.lng) || !Number.isFinite(body.accuracy) || body.accuracy < 0 ||
      !Number.isFinite(body.timestamp) || body.timestamp < now - 30000 || body.timestamp > now + 5000) return fail("locationError");
  saveSharedLocation(found.id, user.id, { lat: body.lat, lng: body.lng, accuracy: body.accuracy, updatedAt: Math.min(now, body.timestamp) });
  return json({ ok: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null);
  const found = typeof body?.id === "string" && getRequest(body.id);
  if (!found || user.role !== "volunteer" || found.volunteerId !== user.id) return fail("notFound", 404);
  clearSharedLocation(found.id);
  return json({ ok: true });
}
