import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLARIFY_LIMIT,
  clarifiedText,
  holdForClarification,
  isClassified,
  nextClarifySlot,
} from "../lib/clarify.ts";
import { messageVoiceLang } from "../lib/speech.ts";

test("a high-urgency request is saved, and a missing layer is still asked", () => {
  assert.equal(
    holdForClarification({ clarify: true, allowAI: true, urgency: "HIGH", slot: "need" }),
    false,
  );
  assert.equal(
    holdForClarification({ clarify: true, allowAI: true, urgency: "LOW", slot: "detail" }),
    true,
  );
  assert.equal(
    holdForClarification({ clarify: true, allowAI: true, urgency: "LOW", slot: null }),
    false,
  );
  assert.equal(isClassified("MEDIUM"), true);
});

test("unassessed text asks for more detail only when AI is allowed", () => {
  assert.equal(
    holdForClarification({
      clarify: true,
      allowAI: true,
      urgency: "NOT_ASSESSED",
      slot: "need",
    }),
    true,
  );
  assert.equal(
    holdForClarification({
      clarify: true,
      allowAI: false,
      urgency: "NOT_ASSESSED",
      slot: "need",
    }),
    false,
  );
  assert.equal(
    holdForClarification({
      clarify: false,
      allowAI: true,
      urgency: "NOT_ASSESSED",
      slot: "need",
    }),
    false,
  );
});

test("follow-up answers are added to the text that will be classified again", () => {
  assert.equal(CLARIFY_LIMIT, 4);
  assert.equal(
    clarifiedText("  need help  ", ["  ", "I cannot walk down the stairs"]),
    "need help\nI cannot walk down the stairs",
  );
  assert.equal(clarifiedText("help", ["soon", "no one is hurt"]).split("\n").length, 3);
});

test("each question fills only the first missing item and skips what is already known", () => {
  assert.equal(nextClarifySlot("hello"), "need");
  assert.equal(nextClarifySlot("需要幫忙"), "need");
  assert.equal(nextClarifySlot("Please buy rice."), "detail");
  assert.equal(nextClarifySlot("請買米"), "detail");
  assert.equal(nextClarifySlot("Please buy 2 bottles of water."), "time");
  assert.equal(nextClarifySlot("請買兩包米"), "time");
  assert.equal(nextClarifySlot("今晚要買米"), "detail");
  assert.equal(nextClarifySlot("Please buy 2 kg of rice tonight."), null);
  assert.equal(nextClarifySlot("hello\n幫忙", ["need"]), "need");
  assert.equal(nextClarifySlot("hello\n幫忙\n買米", ["need", "need"]), "detail");
  assert.equal(nextClarifySlot("Please buy rice.\nsome", ["detail"]), "detail");
  assert.equal(nextClarifySlot("Please buy rice.\n2 kg", ["detail"]), "time");
  assert.equal(nextClarifySlot("hello\nI still need help", ["need"]), "need");
  assert.equal(
    nextClarifySlot("Please buy rice.\n2 kg", ["detail"]),
    "time",
  );
});

test("chatbot speech follows the interface language", () => {
  assert.equal(messageVoiceLang("en"), "en");
  assert.equal(messageVoiceLang("zh-Hant"), "zh-HK");
  assert.equal(messageVoiceLang("zh-Hans"), "zh-CN");
});
