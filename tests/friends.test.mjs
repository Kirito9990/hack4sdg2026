import { test } from "node:test";
import assert from "node:assert/strict";
import { offerState } from "../lib/friends.ts";

test("friendship needs both accepts and a decline blocks it", () => {
  assert.equal(offerState(null, null, false), "none");
  assert.equal(offerState("accept", null, false), "outgoing");
  assert.equal(offerState(null, "accept", false), "incoming");
  assert.equal(offerState("accept", "accept", false), "friends");
  assert.equal(offerState("decline", "accept", false), "declined");
  assert.equal(offerState("accept", "decline", false), "declined");
  assert.equal(offerState("decline", null, true), "friends");
});
