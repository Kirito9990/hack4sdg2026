import { haversineMeters, store } from "@/lib/db";
import { currentUser, fail, json, validCoords } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  if (user.role !== "volunteer") return fail("forbidden", 403);
  if (!user.available) return json({ tasks: [] });
  const params = new URL(request.url).searchParams;
  if (!params.has("lat") || !params.has("lng")) return fail("locationError");
  const lat = Number(params.get("lat")),
    lng = Number(params.get("lng"));
  if (!validCoords(lat, lng)) return fail("locationError");
  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const tasks = store()
    .requests.filter(
      (r) =>
        r.status === "PENDING" &&
        r.dispatch_action === "NEIGHBORHOOD_VOLUNTEER",
    )
    .map((r) => ({ r, distance: haversineMeters(lat, lng, r.lat, r.lng) }))
    .filter(({ distance }) => distance <= 5000)
    .sort(
      (a, b) =>
        rank[a.r.urgency_level] - rank[b.r.urgency_level] ||
        a.distance - b.distance,
    )
    .map(({ r, distance }) => ({
      id: r.id,
      lat: Math.round(r.lat * 100) / 100,
      lng: Math.round(r.lng * 100) / 100,
      urgency_level: r.urgency_level,
      category: r.category,
      source: r.source,
      distanceMeters: Math.round(distance / 500) * 500,
      createdAt: r.createdAt,
    }));
  return json({ tasks });
}
