import { currentUser, fail, json } from "@/lib/server";
import { readRewards, readBadges } from "@/lib/persistence.mjs";
import { rewardSummary, type RewardEvent, type BadgeUnlock } from "@/lib/rewards";
export const runtime = "nodejs";
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  if (user.role !== "volunteer") return fail("forbidden", 403);
  return json(rewardSummary(readRewards(user.id) as RewardEvent[], readBadges(user.id) as BadgeUnlock[]));
}
