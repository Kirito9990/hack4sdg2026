import { register } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  askedSlots,
  clarifyModel,
  clarifyQuestionText,
  clarifySystemPrompt,
  DEFAULT_CLARIFY_MODEL,
} from "../lib/clarify.ts";

register("./alias-loader.mjs", import.meta.url);

test("follow-up questions use Qwen 3.7 Flash", () => {
  assert.equal(clarifyModel(undefined), DEFAULT_CLARIFY_MODEL);
  assert.equal(clarifyModel("nvidia/nemotron-3.5-lightning:free"), "qwen/qwen3.7-flash");
  assert.equal(clarifyModel("qwen/qwen3.7-max"), "qwen/qwen3.7-max");
  assert.equal(clarifyQuestionText('  "How many bottles?"  '), "How many bottles?");
  assert.equal(clarifyQuestionText(""), null);
  assert.equal(clarifyQuestionText("Please call 91234567 now"), null);
  assert.equal(clarifyQuestionText("x".repeat(241)), null);
  assert.match(clarifySystemPrompt("time", "zh-Hant"), /Traditional Chinese/);
  assert.match(clarifySystemPrompt("need", "en"), /what kind of help/);
  assert.match(clarifySystemPrompt("detail", "en", 2), /same point/);
  assert.deepEqual(askedSlots("need,nope,time"), ["need", "time"]);
});

test("a failed follow-up model falls back instead of throwing", async () => {
  const { clarifyQuestion } = await import("../lib/openrouter.ts");
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousModel = process.env.OPENROUTER_CLARIFY_MODEL;
  const original = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_CLARIFY_MODEL = "qwen/qwen3.7-flash";
  try {
    let model = "";
    globalThis.fetch = async (_url, init) => {
      model = JSON.parse(init.body).model;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "How many packs of rice?" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    assert.equal(
      await clarifyQuestion({ text: "Please buy rice.", slot: "detail", locale: "en" }),
      "How many packs of rice?",
    );
    assert.equal(model, "qwen/qwen3.7-flash");
    globalThis.fetch = async () => {
      throw new Error("timeout");
    };
    assert.equal(
      await clarifyQuestion({ text: "Please buy rice.", slot: "detail", locale: "en" }),
      null,
    );
  } finally {
    globalThis.fetch = original;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENROUTER_CLARIFY_MODEL;
    else process.env.OPENROUTER_CLARIFY_MODEL = previousModel;
  }
});
