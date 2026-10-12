import { test } from "node:test";
import assert from "node:assert/strict";
import { compareRequestPriority, waitingParts } from "../lib/request-priority.ts";

const item = (over) => ({
  urgency: "LOW",
  createdAt: "2026-10-12T12:00:00.000Z",
  distance: 1000,
  id: "a",
  ...over,
});

test("urgency outranks waiting time and distance", () => {
  const high = item({ urgency: "HIGH", createdAt: "2026-10-12T12:30:00.000Z", distance: 4000, id: "high" });
  const low = item({ urgency: "LOW", createdAt: "2026-10-12T08:00:00.000Z", distance: 100, id: "low" });
  const medium = item({ urgency: "MEDIUM", createdAt: "2026-10-12T01:00:00.000Z", distance: 50, id: "medium" });
  assert.ok(compareRequestPriority(high, medium) < 0);
  assert.ok(compareRequestPriority(medium, low) < 0);
  assert.ok(compareRequestPriority(low, item({ urgency: "NOT_ASSESSED", distance: 1, createdAt: "2026-10-12T01:00:00.000Z", id: "none" })) < 0);
});

test("longer wait outranks a nearer request of the same urgency", () => {
  const older = item({ createdAt: "2026-10-12T08:00:00.000Z", distance: 3000, id: "old" });
  const newer = item({ createdAt: "2026-10-12T12:00:00.000Z", distance: 200, id: "new" });
  assert.ok(compareRequestPriority(older, newer) < 0);
});

test("distance breaks a tie on urgency and waiting time", () => {
  const near = item({ distance: 100, id: "near" });
  const far = item({ distance: 2000, id: "far" });
  assert.ok(compareRequestPriority(near, far) < 0);
  assert.equal(compareRequestPriority(item({ id: "a" }), item({ id: "b" })), "a".localeCompare("b"));
});

test("waiting time uses minutes, then hours, then days", () => {
  const now = Date.parse("2026-10-12T12:00:00.000Z");
  assert.deepEqual(waitingParts("2026-10-12T11:59:30.000Z", now), { key: "waitingNow", count: 0 });
  assert.deepEqual(waitingParts("2026-10-12T11:40:00.000Z", now), { key: "waitingMinutes", count: 20 });
  assert.deepEqual(waitingParts("2026-10-12T09:00:00.000Z", now), { key: "waitingHours", count: 3 });
  assert.deepEqual(waitingParts("2026-10-10T12:00:00.000Z", now), { key: "waitingDays", count: 2 });
});
