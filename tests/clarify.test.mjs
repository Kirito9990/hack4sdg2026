import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLARIFY_LIMIT,
  clarifiedText,
  emergencyTriage,
  holdForClarification,
  isClassified,
  nextClarifySlot,
  readyToConfirm,
  requestSummary,
  retryReason,
} from "../lib/clarify.ts";
import { messageVoiceLang } from "../lib/speech.ts";

test("a high-urgency request is saved, and a missing layer is still asked", () => {
  assert.equal(
    holdForClarification({ clarify: true, allowAI: true, urgency: "HIGH", slot: "need" }),
    false,
  );
  assert.equal(
    holdForClarification({ clarify: true, allowAI: true, urgency: "LOW", slot: "place" }),
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
  assert.equal(CLARIFY_LIMIT, 3);
  assert.equal(
    clarifiedText("  need help  ", ["  ", "I cannot walk down the stairs"]),
    "need help\nI cannot walk down the stairs",
  );
  assert.equal(requestSummary("hello", ["buy 2 kg of rice"]), "buy 2 kg of rice");
  assert.equal(requestSummary("Please buy rice.", ["tonight"]), "Please buy rice. tonight");
  assert.equal(
    readyToConfirm({ clarify: true, allowAI: true, urgency: "LOW", slot: null }),
    true,
  );
  assert.equal(
    readyToConfirm({ clarify: true, allowAI: true, urgency: "HIGH", slot: null }),
    false,
  );
});

test("one essential question is asked, and a clear or repeated gap stops", () => {
  assert.equal(nextClarifySlot("hello"), "need");
  assert.equal(nextClarifySlot("需要幫忙"), "need");
  assert.equal(nextClarifySlot("Please buy"), "need");
  assert.equal(nextClarifySlot("幫我搬"), "need");
  assert.equal(nextClarifySlot("Please buy rice."), "place");
  assert.equal(nextClarifySlot("請買米"), "place");
  assert.equal(nextClarifySlot("Please buy 2 bottles of water downstairs."), null);
  assert.equal(nextClarifySlot("我喺屋企，請買兩包米"), null);
  assert.equal(nextClarifySlot("今晚要買米"), "place");
  assert.equal(nextClarifySlot("Please buy 2 kg of rice tonight."), "place");
  assert.equal(nextClarifySlot("今晚喺屋企陪我聊天"), null);
  assert.equal(nextClarifySlot("陪我聊天"), "place");
  assert.equal(nextClarifySlot("chat with me at home"), null);
  assert.equal(nextClarifySlot("hello\n幫忙", ["need"]), "detail");
  assert.equal(nextClarifySlot("hello\n買米", ["need"]), "place");
  assert.equal(nextClarifySlot("Please buy rice.\nI am at home", ["need"]), null);
  assert.equal(nextClarifySlot("hello\nhelp", ["need", "detail"]), "place");
  assert.equal(nextClarifySlot("hello", ["need", "detail", "place"]), null);
  assert.equal(nextClarifySlot("I cannot breathe"), null);
  assert.equal(nextClarifySlot("火災"), null);
  assert.equal(emergencyTriage("I cannot breathe")?.urgency_level, "HIGH");
  assert.equal(emergencyTriage("I cannot breathe")?.dispatch_action, "EMERGENCY_medical");
  assert.equal(emergencyTriage("There is a fire")?.category, "NON_MEDICAL");
  assert.equal(emergencyTriage("Please buy rice"), null);
});

test("an off-topic or illogical reply is sent back for another try", () => {
  assert.equal(retryReason("who are you", "request"), "retryRequest");
  assert.equal(retryReason("你是谁", "need"), "retryRequest");
  assert.equal(retryReason("asdfasdf", "detail"), "retryRequest");
  assert.equal(retryReason("Please buy rice.", "request"), null);
  assert.equal(retryReason("Can someone help carry my shopping?", "request"), null);
  assert.equal(retryReason("help", "need"), null);
  assert.equal(retryReason("yes", "need"), "retryRequest");
  assert.equal(retryReason("好的", "detail"), "retryRequest");
  assert.equal(retryReason("ok", "place"), "retryPlace");
  assert.equal(retryReason("I cannot breathe", "request"), null);
  assert.equal(retryReason("at home", "place"), null);
  assert.equal(retryReason("Please buy rice", "place"), "retryPlace");
  assert.equal(retryReason("????", "place"), "retryPlace");
  assert.equal(retryReason("near the market", "place"), "review");
});

test("chatbot speech follows the interface language", () => {
  assert.equal(messageVoiceLang("en"), "en");
  assert.equal(messageVoiceLang("zh-Hant"), "zh-HK");
  assert.equal(messageVoiceLang("zh-Hans"), "zh-CN");
});
