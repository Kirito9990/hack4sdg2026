import { getRequest, haversineMeters, store, persistRequest, view } from "@/lib/db";
import { quoteReward } from "@/lib/rewards";
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
  if (!user.available) return fail("offShiftHint", 403);
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
  const next = { ...found, volunteerId: user.id, status: "ACCEPTED" as const, acceptedAt: new Date().toISOString(), rewardQuote: quoteReward(found, store().users.find(u => u.id === found.residentId), user) };
  delete next.chatExpiresAt;
  persistRequest(next);
  return json(view(next, user));
}
