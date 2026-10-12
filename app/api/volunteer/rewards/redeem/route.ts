import { currentUser, fail, json, sameOrigin } from "@/lib/server";
import { redeemOffer } from "@/lib/persistence.mjs";
import { partnerOffer } from "@/lib/redeem";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("sessionExpired", 401);
  if (user.role !== "volunteer") return fail("forbidden", 403);
  const body = await request.json().catch(() => null);
  const offer = partnerOffer(String(body?.offerId || ""));
  if (!offer) return fail("invalidInput");
  const result = redeemOffer(user.id, offer.id, offer.cost, new Date().toISOString());
  if (result === "alreadyRedeemed") return fail("alreadyRedeemed", 409);
  if (result === "notEnoughPoints") return fail("notEnoughPoints", 400);
  return json({ id: result.id, offerId: offer.id, points: offer.cost, spendable: result.spendable });
}
