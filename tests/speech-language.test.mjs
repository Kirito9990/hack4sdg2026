import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptedDeepgramLanguage,
  openRouterAudioFormat,
  spokenToDeepgram,
  transcriptInstruction,
  transcriptionLanguage,
} from "../lib/speech.ts";

test("voice transcription follows the interface language", () => {
  assert.equal(transcriptionLanguage("en"), "en");
  assert.equal(transcriptionLanguage("zh-Hans"), "zh-CN");
  assert.equal(transcriptionLanguage("zh-Hant"), "zh-HK");
  assert.equal(transcriptionLanguage("fr"), "en");
});

test("mandarin and cantonese stay explicit for the transcription prompt", () => {
  assert.equal(spokenToDeepgram("en", "en"), "en");
  assert.equal(spokenToDeepgram("zh", "en"), "zh-CN");
  assert.equal(spokenToDeepgram("zh", "zh-Hans"), "zh-CN");
  assert.equal(spokenToDeepgram("zh", "zh-Hant"), "zh-Hant");
  assert.equal(spokenToDeepgram("yue", "en"), "zh-HK");
  assert.equal(spokenToDeepgram("yue", "zh-Hans"), "zh-HK");
  assert.equal(spokenToDeepgram("yue", "zh-Hant"), "zh-HK");

  for (const code of ["en", "zh-CN", "zh-Hant", "zh-HK"])
    assert.equal(acceptedDeepgramLanguage(code), code);
  assert.equal(acceptedDeepgramLanguage("zh-HK-extra"), "auto");
  assert.match(transcriptInstruction("zh-HK"), /Cantonese/);
  assert.match(transcriptInstruction("zh-CN"), /Mandarin/);
  assert.equal(transcriptInstruction("en"), "English");
  assert.equal(openRouterAudioFormat("audio/wav"), "wav");
  assert.equal(openRouterAudioFormat("audio/webm;codecs=opus"), "");
  assert.equal(openRouterAudioFormat("audio/mp4"), "m4a");
  assert.equal(openRouterAudioFormat("audio/ogg"), "ogg");
});
