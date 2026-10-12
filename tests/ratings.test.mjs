import { test } from "node:test";
import assert from "node:assert/strict";
import { credibilitySummary, ratingScore } from "../lib/ratings.ts";

test("one low rating does not flag a user", () => {
  assert.equal(ratingScore(0), null);
  assert.equal(ratingScore(6), null);
  assert.equal(ratingScore(3.5), null);
  assert.equal(ratingScore(4), 4);
  assert.deepEqual(credibilitySummary([1]), {
    average: 1,
    count: 1,
    flagged: false,
  });
});

test("two ratings averaging 2 or below flag the user", () => {
  assert.deepEqual(credibilitySummary([1, 2]), {
    average: 1.5,
    count: 2,
    flagged: true,
  });
  assert.deepEqual(credibilitySummary([2, 2]), {
    average: 2,
    count: 2,
    flagged: true,
  });
  assert.equal(credibilitySummary([1, 5]).flagged, false);
  assert.equal(credibilitySummary([5, 5, 5]).flagged, false);
});
