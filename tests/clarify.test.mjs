import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLARIFY_LIMIT,
  clarifiedText,
  holdForClarification,
  isClassified,
} from "../lib/clarify.ts";

test("a successful classification skips follow-up questions", () => {
  for (const urgency of ["HIGH", "MEDIUM", "LOW"]) {
    assert.equal(isClassified(urgency), true);
    assert.equal(
      holdForClarification({ clarify: true, allowAI: true, urgency }),
      false,
    );
  }
});

test("unassessed text asks for more detail only when AI is allowed", () => {
  assert.equal(
    holdForClarification({
      clarify: true,
      allowAI: true,
      urgency: "NOT_ASSESSED",
    }),
    true,
  );
  assert.equal(
    holdForClarification({
      clarify: true,
      allowAI: false,
      urgency: "NOT_ASSESSED",
    }),
    false,
  );
  assert.equal(
    holdForClarification({
      clarify: false,
      allowAI: true,
      urgency: "NOT_ASSESSED",
    }),
    false,
  );
});

test("follow-up answers are added to the text that will be classified again", () => {
  assert.equal(CLARIFY_LIMIT, 2);
  assert.equal(
    clarifiedText("  need help  ", ["  ", "I cannot walk down the stairs"]),
    "need help\nI cannot walk down the stairs",
  );
  assert.equal(clarifiedText("help", ["soon", "no one is hurt"]).split("\n").length, 3);
});
