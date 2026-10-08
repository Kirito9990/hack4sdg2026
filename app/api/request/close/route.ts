import { getRequest, member, persistRequest, store, view } from "@/lib/db";
import { completionReward, earnedBadges, type RewardEvent } from "@/lib/rewards";
import { readRewards } from "@/lib/persistence.mjs";
import { currentUser, fail, json, sameOrigin } from "@/lib/server";
import { clearSharedLocation } from "@/lib/volunteer-location";
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
  const reward = completionReward(found, user, store().users.find(u => u.id === found.volunteerId));
  const next = { ...found, closedReason: found.status === "ACCEPTED" ? "completed" as const : "cancelled" as const, closedAt: reward?.earnedAt || new Date().toISOString(), status: "CLOSED" as const, chatExpiresAt: new Date(Date.now()+7*86400000).toISOString() };
  const badges = reward ? earnedBadges([...(readRewards(reward.volunteerId) as RewardEvent[]), reward]) : [];
  persistRequest(next, reward, badges);
  clearSharedLocation(found.id);
  return json(view(next, user));
}
