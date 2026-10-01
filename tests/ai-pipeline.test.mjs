import { register } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyPrepared,
  classificationPacket,
  prepareAiInput,
} from "../lib/pipeline.ts";

register("./alias-loader.mjs", import.meta.url);

const low = {
  urgency_level: "LOW",
  category: "NON_MEDICAL",
  summary: "Bring water upstairs.",
  dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
  requirements: ["Carry water"],
  tools: [],
  resources: ["Bottled water"],
};

test("text, voice, image, failure, and disabled consent share one pipeline", async () => {
  const text = prepareAiInput({
    text: "Please bring water upstairs.",
    transcript: "",
    hasImage: false,
  });
  let described = 0;
  let classified = 0;
  const textResult = await classifyPrepared(text, {
    allowAI: true,
    locale: "en",
    describeImage: async () => {
      described += 1;
      return "unused";
    },
    classifyText: async (packet) => {
      classified += 1;
      assert.match(packet, /Please bring water upstairs/);
      assert.equal(packet.includes("base64"), false);
      return low;
    },
  });
  assert.equal(described, 0);
  assert.equal(classified, 1);
  assert.equal(textResult.source, "openrouter");
  assert.equal(textResult.classification.urgency, "LOW");
  assert.deepEqual(textResult.classification.matching_tags, [
    "Carry water",
    "Bottled water",
  ]);

  const order = [];
  const image = prepareAiInput({
    text: "The light is out.",
    transcript: "",
    hasImage: true,
  });
  const imageResult = await classifyPrepared(image, {
    allowAI: true,
    locale: "en",
    describeImage: async () => {
      order.push("vision");
      return "A dark stairwell with no visible lamp.";
    },
    classifyText: async (packet) => {
      order.push("classify");
      assert.match(packet, /The light is out/);
      assert.match(packet, /dark stairwell/);
      return { ...low, summary: "Dark stairs need a light." };
    },
  });
  assert.deepEqual(order, ["vision", "classify"]);
  assert.equal(imageResult.imageAnalyzed, true);
  assert.equal(imageResult.classification.summary, "Dark stairs need a light.");
  assert.notEqual(imageResult.classification.urgency, "HIGH");

  const voice = prepareAiInput({
    text: "",
    transcript: "I need help carrying supplies.",
    hasImage: false,
    metadata: { audioStatus: "transcribed" },
  });
  const voiceResult = await classifyPrepared(voice, {
    allowAI: true,
    locale: "en",
    classifyText: async (packet) => {
      assert.match(classificationPacket(voice), /Voice transcript/);
      assert.match(packet, /I need help carrying supplies/);
      return low;
    },
  });
  assert.equal(voiceResult.source, "openrouter");
  assert.equal(voiceResult.classification.urgency, "LOW");

  const failed = await classifyPrepared(
    prepareAiInput({ text: "Snack request", transcript: "", hasImage: false }),
    {
      allowAI: true,
      locale: "en",
      classifyText: async () => {
        throw new Error("OpenRouter 503");
      },
      classifyFallback: async () => {
        throw new Error("Vision provider unavailable");
      },
    },
  );
  assert.equal(failed.source, "fallback");
  assert.equal(failed.classification.urgency, "NOT_ASSESSED");
  assert.notEqual(failed.classification.urgency, "HIGH");

  let calls = 0;
  const disabled = await classifyPrepared(
    prepareAiInput({
      text: "Please bring water.",
      transcript: "",
      hasImage: true,
    }),
    {
      allowAI: false,
      locale: "en",
      describeImage: async () => {
        calls += 1;
        return "should not run";
      },
      classifyText: async () => {
        calls += 1;
        return low;
      },
      classifyFallback: async () => {
        calls += 1;
        return low;
      },
    },
  );
  assert.equal(calls, 0);
  assert.equal(disabled.source, "fallback");
  assert.equal(disabled.classification.urgency, "NOT_ASSESSED");
  assert.equal(disabled.imageAnalyzed, false);
});

test("OpenRouter text classification uses the configured model and retries once", async () => {
  const { triageTextWithOpenRouter } = await import("../lib/openrouter.ts");
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousModel = process.env.OPENROUTER_MODEL;
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_MODEL = "openrouter/free";
  const bodies = [];
  let attempts = 0;
  globalThis.fetch = async (url, options) => {
    attempts += 1;
    assert.equal(String(url), "https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(options.body);
    bodies.push(body);
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.equal(body.model, "openrouter/free");
    if (attempts === 1) throw new Error("timeout");
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(low) } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const result = await triageTextWithOpenRouter("Please bring water.", "en");
    assert.equal(attempts, 2);
    assert.equal(result.urgency_level, "LOW");
    assert.equal(result.summary, "Bring water upstairs.");
    assert.equal(bodies[1].messages[1].content.includes("Please bring water."), true);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = previousModel;
  }
});
