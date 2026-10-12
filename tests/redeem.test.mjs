import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PARTNER_OFFERS, redeemDecision, spendablePoints } from "../lib/redeem.ts";

test("partner offers spend CarePoints once and leave the award balance intact", () => {
  assert.deepEqual(PARTNER_OFFERS.map((offer) => [offer.kind, offer.cost]), [
    ["coupon", 30],
    ["coupon", 50],
    ["vip", 100],
  ]);
  assert.equal(spendablePoints(100, 30), 70);
  assert.equal(redeemDecision({ earned: 100, spent: 0, redeemedIds: [], offerId: "missing" }).error, "invalidInput");
  assert.equal(redeemDecision({ earned: 20, spent: 0, redeemedIds: [], offerId: "bakery-coupon" }).error, "notEnoughPoints");
  assert.equal(redeemDecision({ earned: 40, spent: 0, redeemedIds: ["bakery-coupon"], offerId: "bakery-coupon" }).error, "alreadyRedeemed");
  const allowed = redeemDecision({ earned: 100, spent: 30, redeemedIds: ["bakery-coupon"], offerId: "grocery-coupon" });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.offer.cost, 50);
});

test("a redemption is stored once and cannot spend more than the earned points", async () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-redeem-"));
  process.env.CARECALL_DB_PATH = join(dir, "carecall.sqlite");
  const { redeemOffer, readRedemptions } = await import("../lib/persistence.mjs");
  try {
    assert.equal(redeemOffer("volunteer", "bakery-coupon", 30, "2026-10-13T00:00:00.000Z"), "notEnoughPoints");
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(process.env.CARECALL_DB_PATH);
    db.prepare("INSERT INTO carecall_reward_events(request_id,volunteer_id,points,urgency,rule_version,earned_at) VALUES('req','volunteer',15,'HIGH',1,'2026-10-13T00:00:00.000Z')").run();
    db.prepare("INSERT INTO carecall_reward_events(request_id,volunteer_id,points,urgency,rule_version,earned_at) VALUES('req-2','volunteer',15,'HIGH',1,'2026-10-13T00:01:00.000Z')").run();
    db.close();
    const saved = redeemOffer("volunteer", "bakery-coupon", 30, "2026-10-13T00:02:00.000Z");
    assert.equal(saved.spendable, 0);
    assert.equal(readRedemptions("volunteer").length, 1);
    assert.equal(redeemOffer("volunteer", "bakery-coupon", 30, "2026-10-13T00:03:00.000Z"), "alreadyRedeemed");
    assert.equal(redeemOffer("volunteer", "grocery-coupon", 50, "2026-10-13T00:04:00.000Z"), "notEnoughPoints");
  } finally {
    globalThis.__carecallDatabase?.close();
    delete globalThis.__carecallDatabase;
    rmSync(dir, { recursive: true, force: true });
  }
});
