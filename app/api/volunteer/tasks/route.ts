import { haversineMeters, ratingsFor, store } from "@/lib/db";
import { credibilitySummary } from "@/lib/ratings";
import { currentUser, fail, json, validCoords } from "@/lib/server";
import { quoteReward } from "@/lib/rewards";
import { volunteerCanReceive } from "@/lib/types";
import { compareRequestPriority } from "@/lib/request-priority";
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
  const tasks = store()
    .requests.filter(
      (r) =>
        r.status === "PENDING" &&
        volunteerCanReceive(r),
    )
    .map((r) => ({ r, distance: haversineMeters(lat, lng, r.lat, r.lng) }))
    .filter(({ distance }) => distance <= 5000)
    .sort((a, b) =>
      compareRequestPriority(
        { urgency: a.r.urgency_level, createdAt: a.r.createdAt, distance: a.distance, id: a.r.id },
        { urgency: b.r.urgency_level, createdAt: b.r.createdAt, distance: b.distance, id: b.r.id },
      ),
    )
    .map(({ r, distance }) => ({
      id: r.id,
      rewardPoints: quoteReward(r, store().users.find(u => u.id === r.residentId), user).points,
      lat: Math.round(r.lat * 100) / 100,
      lng: Math.round(r.lng * 100) / 100,
      urgency_level: r.urgency_level,
      category: r.category,
      source: r.source,
      requirements: r.requirements || [],
      tools: r.tools || [],
      resources: r.resources || [],
      distanceMeters: Math.round(distance / 500) * 500,
      createdAt: r.createdAt,
      residentFlagged: credibilitySummary(ratingsFor(r.residentId)).flagged,
    }));
  return json({ tasks });
}
