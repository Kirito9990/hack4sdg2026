import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import ts from "typescript";
import sharp from "sharp";

// Compile the actual TypeScript modules with isolated identity/storage mocks.
// All provider HTTP traffic is intercepted; no credentials, accounts or disk DB.
const require = createRequire(import.meta.url);
function load(file, mocks = {}, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const js = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) return load(name.slice(2) + ".ts", mocks, cache);
    if (name.startsWith("./")) return load(resolve(dirname(file), name + ".ts"), mocks, cache);
    return require(name);
  };
  new Function("require", "module", "exports", js)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const envKeys = ["DEEPGRAM_API_KEY", "DEEPGRAM_MODEL", "DEEPGRAM_LANGUAGE", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "OPENROUTER_VISION_MODEL", "GEMINI_API_KEY"];
const initialEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of envKeys) {
    if (initialEnv[key] === undefined) delete process.env[key];
    else process.env[key] = initialEnv[key];
  }
});
function setup() {
  for (const key of envKeys) delete process.env[key];
  process.env.DEEPGRAM_API_KEY = "test-speech-key";
  process.env.OPENROUTER_API_KEY = "test-router-key";
  globalThis.fetch = async () => { throw new Error("Unexpected provider request"); };
}
const assessment = { urgency_level: "LOW", category: "NON_MEDICAL", summary: "Needs supplies", dispatch_action: "NEIGHBORHOOD_VOLUNTEER" };
const speechResponse = (text = "Need supplies") => Response.json({ results: { channels: [{ alternatives: [{ transcript: text }] }] } });
const routerResponse = (value = assessment) => Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });

test("Deepgram sends binary audio, normalized MIME and automatic language detection", async () => {
  setup();
  globalThis.fetch = async (url, options) => {
    assert.equal(url.origin, "https://api.deepgram.com");
    assert.equal(url.searchParams.get("model"), "nova-3");
    assert.equal(url.searchParams.get("detect_language"), "true");
    assert.equal(url.searchParams.has("language"), false);
    assert.equal(options.headers.Authorization, "Token test-speech-key");
    assert.equal(options.headers["Content-Type"], "audio/webm");
    assert.deepEqual(Buffer.from(options.body), Buffer.from("fake audio"));
    assert(options.signal instanceof AbortSignal);
    return speechResponse("  Need supplies  ");
  };
  assert.equal(await load("lib/speech.ts").transcribeWithDeepgram(Buffer.from("fake audio"), "audio/webm;codecs=opus", "auto"), "Need supplies");
});

test("Cantonese server setting and explicit caller language do not mix with detection", async () => {
  setup();
  process.env.DEEPGRAM_LANGUAGE = "zh-HK";
  const languages = [];
  globalThis.fetch = async (url) => {
    languages.push(url.searchParams.get("language"));
    assert.equal(url.searchParams.has("detect_language"), false);
    return speechResponse();
  };
  const { transcribeWithDeepgram } = load("lib/speech.ts");
  await transcribeWithDeepgram(Buffer.from("a"), "audio/mp4", "auto");
  await transcribeWithDeepgram(Buffer.from("a"), "audio/mp4", "en");
  assert.deepEqual(languages, ["zh-HK", "en"]);
});

test("Deepgram rejects missing keys, empty transcripts, HTTP failure and timeout", async () => {
  setup();
  const { transcribeWithDeepgram } = load("lib/speech.ts");
  const call = () => transcribeWithDeepgram(Buffer.from("a"), "audio/webm", "auto");
  delete process.env.DEEPGRAM_API_KEY;
  await assert.rejects(call, /Missing speech key/);
  process.env.DEEPGRAM_API_KEY = "fake";
  globalThis.fetch = async () => speechResponse(" ");
  await assert.rejects(call, /Empty transcript/);
  globalThis.fetch = async () => new Response(null, { status: 429 });
  await assert.rejects(call, /Speech provider unavailable/);
  globalThis.fetch = async () => { throw new DOMException("Timed out", "TimeoutError"); };
  await assert.rejects(call, { name: "TimeoutError" });
});

test("OpenRouter requests supported schema endpoints with text only", async () => {
  setup();
  process.env.OPENROUTER_MODEL = "test/text-model";
  process.env.OPENROUTER_VISION_MODEL = "test/vision-model";
  const bodies = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-router-key");
    const body = JSON.parse(options.body);
    bodies.push(body);
    assert.equal(body.provider.require_parameters, true);
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, true);
    assert(options.signal instanceof AbortSignal);
    return routerResponse();
  };
  const { triageRequestWithOpenRouter } = load("lib/openrouter.ts");
  assert.deepEqual(await triageRequestWithOpenRouter({ text: "Need help", locale: "zh-Hant" }), assessment);
  await triageRequestWithOpenRouter({ text: "Spoken details", locale: "zh-Hant", image: Buffer.from("jpeg") });
  assert.equal(bodies[0].model, "test/text-model");
  assert.equal(bodies[0].messages[1].content, "Need help");
  assert.equal(bodies[1].model, "test/text-model");
  assert.match(bodies[1].messages[0].content, /zh-Hant/);
  assert.equal(bodies[1].messages[1].content, "Spoken details");
  assert(!JSON.stringify(bodies).includes("image_url"));
});

test("OpenRouter fails closed on HTTP errors, malformed JSON and invalid classifications", async () => {
  setup();
  const call = () => load("lib/openrouter.ts").triageRequestWithOpenRouter({ text: "Need help", locale: "en" });
  delete process.env.OPENROUTER_API_KEY;
  await assert.rejects(call, /Missing text key/);
  process.env.OPENROUTER_API_KEY = "fake";
  globalThis.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(call, /Text provider unavailable/);
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: "not JSON" } }] });
  await assert.rejects(call, SyntaxError);
  globalThis.fetch = async () => routerResponse({ ...assessment, urgency_level: "GUESS" });
  await assert.rejects(call, /Invalid triage/);
});

async function intake({ consent = true, photo = false, audio = false, text = "", provider = "ok", expectedStatus = 201, gemini = false } = {}) {
  setup();
  if (gemini) process.env.GEMINI_API_KEY = "test-fallback-key";
  const calls = [], state = { requests: [] };
  let persisted = false;
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("generativelanguage")) return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(assessment) }] } }] });
    if (provider === "fail") return new Response(null, { status: 503 });
    return String(url).includes("deepgram") ? speechResponse("Need supplies +85261234567") : routerResponse();
  };
  const user = { id: "resident", role: "resident", privacy: { allowAI: consent } };
  const mocks = {
    "@/lib/server": {
      sameOrigin: () => true, currentUser: async () => user, validCoords: () => true,
      fail: (error, status = 400) => Response.json({ error }, { status }),
      json: (body, status = 200) => Response.json(body, { status }),
    },
    "@/lib/db": {
      redact: (text) => text.replace(/\+85261234567/g, "[redacted]"),
      store: () => state, persist: () => { persisted = true; }, view: (request) => request,
    },
  };
  const form = new FormData();
  form.set("lat", "22.3"); form.set("lng", "114.1"); form.set("locale", "zh-Hant");
  if (text) form.set("text", text);
  if (audio) form.set("audio", new Blob(audio === "empty" ? [] : ["synthetic audio"], { type: "audio/webm" }), "voice.webm");
  if (photo) {
    const png = await sharp({ create: { width: 1800, height: 10, channels: 3, background: "red" } }).png().toBuffer();
    form.set("image", new Blob([png], { type: "image/png" }), "photo.png");
  }
  const response = await load("app/api/triage/route.ts", mocks).POST(new Request("http://localhost/api/triage", { method: "POST", body: form }));
  assert.equal(response.status, expectedStatus);
  assert.equal(persisted, expectedStatus === 201);
  assert.equal(state.requests.length, expectedStatus === 201 ? 1 : 0);
  return { body: await response.json(), calls };
}

test("intake transcribes speech but keeps the photo solely as a viewable attachment", async () => {
  const { body, calls } = await intake({ audio: true, photo: true });
  assert.equal(body.source, "openrouter");
  assert.equal(body.audioStatus, "transcribed");
  assert.equal(body.imageStatus, "prepared");
  assert.equal(body.speechTranscript, "Need supplies [redacted]");
  assert.equal(body.imageDescription, undefined);
  assert.equal(body.imageText, undefined);
  assert.equal(calls.length, 2);
  const content = JSON.parse(calls[1].options.body).messages[1].content;
  assert.equal(content, "Need supplies [redacted]");
  assert(!calls[1].options.body.includes("image"));
  const jpeg = Buffer.from(body.imageData.split(",")[1], "base64");
  const metadata = await sharp(jpeg).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 960);
  assert.equal(metadata.exif, undefined);
});

test("empty, photo-only, whitespace and zero-byte audio requests are rejected before AI or storage", async () => {
  for (const input of [{}, { photo: true }, { photo: true, text: " \n " }, { photo: true, audio: "empty" }]) {
    const { body, calls } = await intake({ ...input, expectedStatus: 400 });
    assert.equal(body.error, "emptyRequest");
    assert.equal(calls.length, 0);
  }
});

test("no AI consent makes zero provider requests even with keys and attachments", async () => {
  const { body, calls } = await intake({ consent: false, photo: true, audio: true });
  assert.equal(calls.length, 0);
  assert.equal(body.source, "fallback");
  assert.equal(body.audioStatus, "unavailable");
  assert.equal(body.imageStatus, "prepared");
});

test("provider outage preserves the request with honest unassessed media states", async () => {
  const { body } = await intake({ audio: true, photo: true, provider: "fail" });
  assert.equal(body.source, "fallback");
  assert.equal(body.urgency_level, "HIGH");
  assert.equal(body.category, "OTHER");
  assert.equal(body.audioStatus, "unavailable");
  assert.equal(body.imageStatus, "prepared");
  assert.equal(body.transcript, undefined);
});

test("typed text never causes the recording to be skipped", async () => {
  const { body, calls } = await intake({ audio: true, text: "Also need a torch" });
  assert.equal(body.audioStatus, "transcribed");
  assert.equal(body.source, "openrouter");
  assert.equal(calls.length, 2);
  assert(calls[0].url.includes("deepgram"));
  assert.equal(JSON.parse(calls[1].options.body).messages[1].content, "Also need a torch\n\nNeed supplies [redacted]");
  assert.equal(body.speechTranscript, "Need supplies [redacted]");
});

test("text-plus-photo classifies only the text", async () => {
  const { body, calls } = await intake({ text: "Need help", photo: true });
  assert.equal(body.source, "openrouter");
  assert.equal(body.imageStatus, "prepared");
  assert(body.imageData.startsWith("data:image/jpeg;base64,"));
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].options.body).messages[1].content, "Need help");
});

test("Gemini fallback also excludes photo bytes while retaining text and audio", async () => {
  const { body, calls } = await intake({ text: "Need help", photo: true, audio: true, provider: "fail", gemini: true });
  assert.equal(body.source, "gemini");
  assert.equal(body.imageStatus, "prepared");
  const parts = JSON.parse(calls.at(-1).options.body).contents[0].parts;
  assert(parts.some((part) => part.inlineData?.mimeType === "audio/webm"));
  assert(parts.every((part) => !part.inlineData?.mimeType.startsWith("image/")));
});

test("untrusted provider fields cannot become saved request fields", async () => {
  setup();
  globalThis.fetch = async () => routerResponse({ ...assessment, residentId: "attacker", callPhone: "12345678", imageData: "untrusted" });
  const result = await load("lib/openrouter.ts").triageRequestWithOpenRouter({ text: "Need help", locale: "en" });
  assert.deepEqual(result, assessment);
});

test("typed text is preserved when speech fails and is never called a transcript", async () => {
  const { body } = await intake({ audio: true, text: "Typed fallback", provider: "fail" });
  assert.equal(body.transcript, "Typed fallback");
  assert.equal(body.speechTranscript, undefined);
  assert.equal(body.audioStatus, "unavailable");
});

test("participant views redact extracted personal details, including completed history", () => {
  setup();
  const previousStore = globalThis.__carecallV3;
  const user = { id: "resident", name: "Private Person", phone: "+85261234567", address: "Private Flat", privacy: { allowChat: true } };
  globalThis.__carecallV3 = { users: [user], sessions: [], requests: [], messages: [] };
  try {
    const { view } = load("lib/db.ts", { "./persistence.mjs": { loadSnapshot: () => null, writeSnapshot: () => {} } });
    for (const status of ["PENDING", "CLOSED"]) {
      const personalText = "Private Person at Private Flat +85261234567";
      const result = view({ ...assessment, status, residentId: user.id, speechTranscript: personalText }, user);
      for (const field of ["speechTranscript"]) {
        assert(!result[field].includes("Private"));
        assert(!result[field].includes("61234567"));
        assert(result[field].includes("hidden"));
      }
    }
  } finally {
    if (previousStore === undefined) delete globalThis.__carecallV3;
    else globalThis.__carecallV3 = previousStore;
  }
});

test("public nearby listings do not expose speech or photo extraction", async () => {
  setup();
  const { GET } = load("app/api/volunteer/tasks/route.ts", {
    "@/lib/server": { currentUser: async () => ({ role: "volunteer", available: true }), validCoords: () => true, json: Response.json },
    "@/lib/db": { haversineMeters: () => 100, store: () => ({ requests: [{ ...assessment, status: "PENDING", lat: 22.3, lng: 114.1, transcript: "private", speechTranscript: "private", imageDescription: "private", imageText: "private" }] }) },
  });
  const response = await GET(new Request("http://localhost/api/volunteer/tasks?lat=22.3&lng=114.1"));
  const data = await response.json();
  assert.equal(data.tasks.length, 1);
  for (const field of ["transcript", "speechTranscript", "imageDescription", "imageText"]) assert(!(field in data.tasks[0]));
});
