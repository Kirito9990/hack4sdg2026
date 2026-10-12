import { currentUser, fail, json } from "@/lib/server";
import { readRewards, readBadges, readRedemptions } from "@/lib/persistence.mjs";
import { rewardSummary, type RewardEvent, type BadgeUnlock } from "@/lib/rewards";
import { PARTNER_OFFERS, spendablePoints } from "@/lib/redeem";
export const runtime = "nodejs";
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  if (user.role !== "volunteer") return fail("forbidden", 403);
  const summary = rewardSummary(readRewards(user.id) as RewardEvent[], readBadges(user.id) as BadgeUnlock[]);
  const redemptions = readRedemptions(user.id);
  const redeemed = new Set(redemptions.map((item: { offerId: string }) => item.offerId));
  return json({
    ...summary,
    spendable: spendablePoints(
      summary.points,
      redemptions.reduce((sum: number, item: { points: number }) => sum + item.points, 0),
    ),
    offers: PARTNER_OFFERS.map((offer) => ({ ...offer, redeemed: redeemed.has(offer.id) })),
  });
}
