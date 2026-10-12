export const PARTNER_OFFERS = [
  { id: "bakery-coupon", merchant: "cornerBakery", kind: "coupon", cost: 30 },
  { id: "grocery-coupon", merchant: "neighbourGrocery", kind: "coupon", cost: 50 },
  { id: "pharmacy-vip", merchant: "communityPharmacy", kind: "vip", cost: 100 },
] as const;

export type PartnerOffer = (typeof PARTNER_OFFERS)[number];
export type PartnerKind = PartnerOffer["kind"];

export function partnerOffer(id: string) {
  return PARTNER_OFFERS.find((offer) => offer.id === id);
}

export function spendablePoints(earned: number, spent: number) {
  return Math.max(0, earned - spent);
}

export function redeemDecision(input: {
  earned: number;
  spent: number;
  redeemedIds: readonly string[];
  offerId: string;
}) {
  const offer = partnerOffer(input.offerId);
  if (!offer) return { ok: false as const, error: "invalidInput" as const };
  if (input.redeemedIds.includes(offer.id)) return { ok: false as const, error: "alreadyRedeemed" as const };
  if (spendablePoints(input.earned, input.spent) < offer.cost)
    return { ok: false as const, error: "notEnoughPoints" as const, offer };
  return { ok: true as const, offer };
}
