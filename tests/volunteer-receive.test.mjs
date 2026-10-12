import { test } from "node:test";
import assert from "node:assert/strict";
import { volunteerCanReceive } from "../lib/types.ts";

test("volunteers receive neighbourhood and medical requests", () => {
  assert.equal(
    volunteerCanReceive({
      dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
      category: "OTHER",
    }),
    true,
  );
  assert.equal(
    volunteerCanReceive({
      dispatch_action: "EMERGENCY_medical",
      category: "MEDICAL",
    }),
    true,
  );
  assert.equal(
    volunteerCanReceive({
      dispatch_action: "EMERGENCY_nonmedical",
      category: "MEDICAL",
    }),
    true,
  );
  assert.equal(
    volunteerCanReceive({
      dispatch_action: "EMERGENCY_nonmedical",
      category: "NON_MEDICAL",
    }),
    false,
  );
});
