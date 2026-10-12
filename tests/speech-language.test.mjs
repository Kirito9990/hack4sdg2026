import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptedDeepgramLanguage,
  listenSearchParams,
  spokenToDeepgram,
  transcriptionLanguage,
} from "../lib/speech.ts";

test("voice transcription follows the interface language", () => {
  assert.equal(transcriptionLanguage("en"), "en");
  assert.equal(transcriptionLanguage("zh-Hans"), "zh-CN");
  assert.equal(transcriptionLanguage("zh-Hant"), "zh-HK");
  assert.equal(transcriptionLanguage("fr"), "en");
});

test("mandarin and cantonese use explicit nova-3 language codes", () => {
  assert.equal(spokenToDeepgram("en", "en"), "en");
  assert.equal(spokenToDeepgram("zh", "en"), "zh-CN");
  assert.equal(spokenToDeepgram("zh", "zh-Hans"), "zh-CN");
  assert.equal(spokenToDeepgram("zh", "zh-Hant"), "zh-Hant");
  assert.equal(spokenToDeepgram("yue", "en"), "zh-HK");
  assert.equal(spokenToDeepgram("yue", "zh-Hans"), "zh-HK");
  assert.equal(spokenToDeepgram("yue", "zh-Hant"), "zh-HK");

  for (const code of ["en", "zh-CN", "zh-Hant", "zh-HK"]) {
    assert.equal(acceptedDeepgramLanguage(code), code);
    const params = listenSearchParams(code);
    assert.equal(params.get("language"), code);
    assert.equal(params.get("detect_language"), null);
    assert.equal(params.get("model"), process.env.DEEPGRAM_MODEL || "nova-3");
  }

  const detected = listenSearchParams("auto");
  assert.equal(detected.get("language"), null);
  assert.deepEqual(detected.getAll("detect_language"), ["en", "zh"]);
  assert.equal(acceptedDeepgramLanguage("zh-HK-extra"), "auto");
});
