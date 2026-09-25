import { getRequest, haversineMeters, store, view } from "@/lib/db";
import { currentUser, fail, json, sameOrigin, validCoords } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  if (user.role !== "volunteer") return fail("forbidden", 403);
  const body = await request.json().catch(() => null);
  if (!body || !validCoords(body.lat, body.lng)) return fail("locationError");
  const found = getRequest(body.id);
  if (!found || found.dispatch_action !== "NEIGHBORHOOD_VOLUNTEER")
    return fail("notFound", 404);
  if (found.status === "ACCEPTED" && found.volunteerId === user.id)
    return json(view(found, user));
  if (found.status !== "PENDING") return fail("alreadyAccepted", 409);
  if (
    store().requests.some(
      (r) => r.volunteerId === user.id && r.status === "ACCEPTED",
    )
  )
    return fail("activeTask", 409);
  if (haversineMeters(body.lat, body.lng, found.lat, found.lng) > 5000)
    return fail("outOfRange", 403);
  // Synchronous check and mutation: concurrent local accepts cannot overwrite this match.
  found.volunteerId = user.id;
  found.status = "ACCEPTED";
  found.acceptedAt = new Date().toISOString();
  found.chatExpiresAt = new Date(Date.now() + 86400000).toISOString();
  return json(view(found, user));
}
