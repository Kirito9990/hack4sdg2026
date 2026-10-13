import { register } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  askedSlots,
  clarifyModel,
  clarifyQuestionText,
  clarifySystemPrompt,
  DEFAULT_CLARIFY_MODEL,
  DEFAULT_TRIAGE_MODEL,
  triageModel,
} from "../lib/clarify.ts";

register("./alias-loader.mjs", import.meta.url);

test("follow-up questions use Qwen3.8 Omni Flash", () => {
  assert.equal(DEFAULT_CLARIFY_MODEL, "qwen/qwen3.8-omni-flash");
  assert.equal(DEFAULT_TRIAGE_MODEL, "qwen/qwen3.8-omni-flash");
  assert.equal(clarifyModel(undefined), DEFAULT_CLARIFY_MODEL);
  assert.equal(clarifyModel("nvidia/nemotron-3.5-lightning:free"), "qwen/qwen3.8-omni-flash");
  assert.equal(clarifyModel("qwen/qwen3.7-max"), "qwen/qwen3.7-max");
  assert.equal(triageModel(undefined), DEFAULT_TRIAGE_MODEL);
  assert.equal(triageModel("openrouter/free"), "qwen/qwen3.8-omni-flash");
  assert.equal(triageModel("qwen/qwen3.7-max"), "qwen/qwen3.7-max");
  assert.equal(clarifyQuestionText('  "How many bottles?"  '), "How many bottles?");
  assert.equal(clarifyQuestionText(""), null);
  assert.equal(clarifyQuestionText("Please call 91234567 now"), null);
  assert.equal(clarifyQuestionText("x".repeat(241)), null);
  assert.equal(clarifyQuestionText("What is your phone number?"), null);
  assert.match(clarifySystemPrompt("time", "zh-Hant"), /Traditional Chinese/);
  assert.match(clarifySystemPrompt("need", "en"), /practical task or company/);
  assert.match(clarifySystemPrompt("detail", "en"), /Do not ask when/);
  assert.deepEqual(askedSlots("need,nope,time"), ["need", "time"]);
});

test("speech transcription uses the same Qwen Omni model and wav audio", async () => {
  const { spokenTranscript, transcribeWithOpenRouter } = await import("../lib/openrouter.ts");
  assert.equal(spokenTranscript('```\n"Please bring water."\n```'), "Please bring water.");
  assert.equal(spokenTranscript("Transcript: 買兩包米"), "買兩包米");
  assert.equal(spokenTranscript("silence"), "");
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousModel = process.env.OPENROUTER_MODEL;
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_MODEL = "openrouter/free";
  try {
    let body = null;
    globalThis.fetch = async (_url, init) => {
      body = JSON.parse(init.body);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "Please bring water." } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    assert.equal(
      await transcribeWithOpenRouter(Buffer.from("RIFF"), "audio/wav", "zh-HK"),
      "Please bring water.",
    );
    assert.equal(body.model, "qwen/qwen3.8-omni-flash");
    assert.equal(body.messages[1].content[1].input_audio.format, "wav");
    assert.match(body.messages[0].content, /Cantonese/);
    await assert.rejects(() =>
      transcribeWithOpenRouter(Buffer.from("webm"), "audio/webm", "en"),
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = previousModel;
  }
});

test("a failed follow-up model falls back instead of throwing", async () => {
  const { clarifyQuestion } = await import("../lib/openrouter.ts");
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousModel = process.env.OPENROUTER_CLARIFY_MODEL;
  const original = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_CLARIFY_MODEL = "qwen/qwen3.8-omni-flash";
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
    assert.equal(model, "qwen/qwen3.8-omni-flash");
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
