// Explicitly opt-in: sends synthetic speech/text to live providers and consumes quota.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import ts from "typescript";
import sharp from "sharp";
import nextEnv from "@next/env";

if (!process.argv.includes("--confirm-live")) {
  console.log("Requires --confirm-live and a synthetic WAV path. Uses live provider quota.");
  process.exit(1);
}
const wavPath = process.argv.find((arg) => arg.endsWith(".wav"));
if (!wavPath) { console.log("Supply a synthetic WAV saying: Please help me carry drinking water upstairs."); process.exit(1); }
// The runtime loads secrets. Never display env-file contents, values or headers.
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const secrets = [process.env.DEEPGRAM_API_KEY, process.env.OPENROUTER_API_KEY, process.env.GEMINI_API_KEY].filter(Boolean);
const redactOutput = (value) => {
  let text = JSON.stringify(value);
  for (const secret of secrets) {
    text = text.split(secret).join("[hidden]").split(secret.trim()).join("[hidden]");
  }
  return text;
};
const report = { tests: [], providerRequests: [] };
function print(value) { console.log(redactOutput(value)); }
for (const key of ["DEEPGRAM_API_KEY", "OPENROUTER_API_KEY"]) {
  if (!process.env[key]?.trim()) { print({ setup: "failed", missingVariable: key }); process.exit(1); }
}
// This test specifically verifies the two requested providers, without fallback.
delete process.env.GEMINI_API_KEY;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const hostname = new URL(url).hostname;
  if (!["api.deepgram.com", "openrouter.ai"].includes(hostname)) throw new Error("Unexpected provider");
  if (hostname === "openrouter.ai" && JSON.parse(options.body).messages.some((message) => typeof message.content !== "string")) {
    throw new Error("Test blocked non-text input to OpenRouter");
  }
  const started = Date.now();
  try {
    const response = await originalFetch(url, { ...options, redirect: "error" });
    const record = { provider: hostname, status: response.status, durationMs: Date.now() - started };
    report.providerRequests.push(record);
    print(record);
    const readJson = response.json.bind(response);
    response.json = async () => {
      try {
        const data = await readJson();
        record.totalDurationMs = Date.now() - started;
        if (hostname === "openrouter.ai") {
          record.providerError = !!data.error;
          if (typeof data.error?.code === "number") record.providerErrorCode = data.error.code;
          const content = data.choices?.[0]?.message?.content;
          record.hasTextContent = typeof content === "string" && content.length > 0;
          try {
            const parsed = JSON.parse((content || "").replace(/^```(?:json)?\s*|\s*```$/g, ""));
            record.validJson = true;
            record.hasSummary = typeof parsed.summary === "string" && !!parsed.summary.trim();
          } catch { record.validJson = false; }
        }
        print({ responseBody: record });
        return data;
      } catch (error) {
        record.bodyFailure = ["TimeoutError", "AbortError"].includes(error?.name) ? "timeout" : "body read error";
        record.totalDurationMs = Date.now() - started;
        print({ responseBody: record });
        throw new Error(record.bodyFailure);
      }
    };
    return response;
  } catch (error) {
    const record = { provider: hostname, failure: error?.name === "TimeoutError" ? "timeout" : "network error", durationMs: Date.now() - started };
    report.providerRequests.push(record);
    print(record);
    throw new Error(record.failure);
  }
};
const require = createRequire(import.meta.url);
function load(file, mocks, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) return load(name.slice(2) + ".ts", mocks, cache);
    return require(name);
  };
  new Function("require", "module", "exports", code)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const outputDir = resolve("local-artifacts/live-ai-20261001");
mkdirSync(outputDir, { recursive: true });
try {
  const jpeg = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700">
    <rect width="1000" height="700" fill="white"/>
    <text x="60" y="95" font-family="Arial" font-size="56" fill="black">DRINKING WATER</text>
    <text x="60" y="165" font-family="Arial" font-size="40" fill="black">PLEASE HELP CARRY UPSTAIRS</text>
    <path d="M550 650V540H650V430H750V320H850V230" stroke="#555" stroke-width="24" fill="none"/>
    <rect x="80" y="330" width="310" height="280" fill="#e0ba87" stroke="black" stroke-width="5"/>
    <text x="105" y="480" font-family="Arial" font-size="38" fill="black">WATER</text>
    </svg>`)).jpeg({ quality: 90 }).toBuffer();
  writeFileSync(resolve(outputDir, "water-test.jpg"), jpeg);
  const audio = readFileSync(wavPath);
  const state = { requests: [] };
  const user = { id: "synthetic-resident", role: "resident", privacy: { allowAI: true } };
  const { POST } = load("app/api/triage/route.ts", {
    "@/lib/server": {
      currentUser: async () => user, sameOrigin: () => true, validCoords: () => true,
      json: (body, status = 200) => Response.json(body, { status }),
      fail: (error, status = 400) => Response.json({ error }, { status }),
    },
    "@/lib/db": { store: () => state, persist() {}, view: (record) => record, redact: (text) => text.slice(0, 2000) },
  });
  const modes = ["audio-and-attachment", "photo-only-rejected"];
  for (const mode of modes) {
    const form = new FormData();
    form.set("lat", "22.3"); form.set("lng", "114.1"); form.set("locale", "en");
    if (mode === "audio-and-attachment") {
      form.set("audio", new Blob([audio], { type: "audio/wav" }), "synthetic.wav");
      form.set("text", "Please also bring a torch.");
    }
    form.set("image", new Blob([jpeg], { type: "image/jpeg" }), "synthetic.jpg");
    const callsBefore = report.providerRequests.length;
    const savedBefore = state.requests.length;
    const response = await POST(new Request("http://localhost/api/triage", { method: "POST", body: form }));
    const result = await response.json();
    const checks = mode === "photo-only-rejected" ? {
      rejected: response.status === 400 && result.error === "emptyRequest",
      noProviderCalls: report.providerRequests.length === callsBefore,
      notSaved: state.requests.length === savedBefore,
    } : {
      saved: response.status === 201,
      openrouter: result.source === "openrouter",
      photoAttached: result.imageData?.startsWith("data:image/jpeg;base64,") === true,
      photoNotAnalyzed: result.imageStatus === "prepared" && result.imageText === undefined && result.imageDescription === undefined,
    };
    if (mode === "audio-and-attachment") {
      checks.speechTranscribed = result.audioStatus === "transcribed";
      checks.speechContent = /drinking\s+water/i.test(result.speechTranscript || "") && /upstairs/i.test(result.speechTranscript || "");
      checks.typedTextRetained = /torch/i.test(result.transcript || "");
    }
    const entry = { mode, passed: Object.values(checks).every(Boolean), checks,
      speechTranscript: result.speechTranscript, summary: result.summary };
    report.tests.push(entry);
    print(entry);
    // Avoid spending more quota when the initial integration already failed.
    if (!entry.passed) break;
  }
  report.passed = report.tests.length === modes.length && report.tests.every((test) => test.passed);
  process.exitCode = report.passed ? 0 : 1;
} catch {
  report.passed = false;
  report.failure = "Live check could not complete; inspect safe status records above.";
  process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
  const filename = "result-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
  writeFileSync(resolve(outputDir, filename), redactOutput(report) + "\n");
  print({ passed: report.passed, report: "local-artifacts/live-ai-20261001/" + filename });
}
