import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attachTranslations,
  chatLocale,
  cleanTranslation,
  needsTranslation,
  translationPrompt,
} from "../lib/chat-translate.ts";

test("partner messages are translated into the reader's language", async () => {
  assert.equal(chatLocale("zh-Hant"), "zh-Hant");
  assert.equal(chatLocale("nope"), null);
  assert.equal(needsTranslation("I will arrive in ten minutes.", "zh-Hant"), true);
  assert.equal(needsTranslation("我十分鐘之後到你度。", "zh-Hant"), false);
  assert.equal(needsTranslation("我會在十分鐘後到達。", "zh-Hant"), true);
  assert.equal(needsTranslation("我十分钟后到。", "zh-Hant"), true);
  assert.equal(needsTranslation("我十分鐘之後到你度。", "en"), true);
  assert.equal(needsTranslation("I will arrive in ten minutes.", "en"), false);
  assert.equal(needsTranslation("我十分鐘之後到你度。", "zh-Hans"), true);
  assert.equal(needsTranslation("我十分钟后到你那里。", "zh-Hans"), false);
  assert.match(translationPrompt("zh-Hant"), /spoken Hong Kong Cantonese/);
  assert.equal(cleanTranslation("粵語：我十分鐘之後到你度。", "I will arrive in ten minutes."), "我十分鐘之後到你度。");
  assert.equal(cleanTranslation("", "hello"), null);

  let calls = 0;
  const messages = [
    { id: "own-1", senderId: "resident", text: "I will arrive in ten minutes." },
    { id: "partner-1", senderId: "volunteer", text: "I will arrive in ten minutes." },
    { id: "partner-2", senderId: "volunteer", text: "我十分鐘之後到你度。" },
  ];
  const first = await attachTranslations(messages, "resident", "zh-Hant", async (text) => {
    calls += 1;
    assert.equal(text, "I will arrive in ten minutes.");
    return "我十分鐘之後到你度。";
  });
  assert.equal(calls, 1);
  assert.equal(first[0].translation, undefined);
  assert.equal(first[1].translation, "我十分鐘之後到你度。");
  assert.equal(first[2].translation, undefined);

  const second = await attachTranslations(messages, "resident", "zh-Hant", async () => {
    calls += 1;
    return "should not run";
  });
  assert.equal(calls, 1);
  assert.equal(second[1].translation, "我十分鐘之後到你度。");
  const unscoped = await attachTranslations(messages, "resident", null, async () => {
    calls += 1;
    return "should not run";
  });
  assert.equal(calls, 1);
  assert.equal(unscoped[1].translation, undefined);
});

test("a failed translation leaves the original message", async () => {
  const messages = [{ id: "fail-" + Date.now(), senderId: "volunteer", text: "Please wait downstairs." }];
  const shown = await attachTranslations(messages, "resident", "zh-Hant", async () => {
    throw new Error("offline");
  });
  assert.equal(shown[0].translation, undefined);
  assert.equal(shown[0].text, "Please wait downstairs.");
});
