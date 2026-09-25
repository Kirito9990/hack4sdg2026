import { getRequest, member } from "@/lib/db";
import { currentUser, fail, json, sameOrigin, validCoords } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  const body = await request.json().catch(() => null);
  if (!body || !validCoords(body.lat, body.lng)) return fail("locationError");
  const r = getRequest(body.id);
  if (!r || !member(r, user) || r.status !== "ACCEPTED")
    return fail("notFound", 404);
  try {
    const url =
      "https://router.project-osrm.org/route/v1/driving/" +
      body.lng +
      "," +
      body.lat +
      ";" +
      r.lng +
      "," +
      r.lat +
      "?overview=full&geometries=geojson";
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) return fail("routeFailed", 502);
    const result = await response.json(),
      route = result.routes?.[0];
    if (result.code !== "Ok" || !route?.geometry?.coordinates?.length)
      return fail("routeFailed", 502);
    return json({
      coordinates: route.geometry.coordinates,
      distance: route.distance,
      duration: route.duration,
    });
  } catch {
    return fail("routeFailed", 502);
  }
}
