import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { AI_NOTICE_VERSION, aiProcessingAllowed, needsAiChoice } from "../lib/ai-consent.ts";
import { translate } from "../lib/i18n.ts";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const marker = "UNIQUEAUDIOMARKER";
const markerB64 = Buffer.from(marker).toString("base64");
const oldClip = "data:audio/webm;base64,T2xkQ2xpcA==";

test("AI processing requires an explicit choice for the current notice", () => {
  assert.equal(aiProcessingAllowed({ allowAI: false, allowCalls: false, allowChat: true }), false);
  assert.equal(aiProcessingAllowed({ allowAI: true, allowCalls: false, allowChat: true }), false);
  assert.equal(
    aiProcessingAllowed({
      allowAI: true,
      allowCalls: false,
      allowChat: true,
      aiChoice: "allow",
      aiChoiceAt: "2026-10-15T00:00:00.000Z",
      aiNoticeVersion: "older-notice",
    }),
    false,
  );
  assert.equal(
    needsAiChoice({ allowAI: true, allowCalls: false, allowChat: true }),
    true,
  );
  const allowed = {
    allowAI: true,
    allowCalls: false,
    allowChat: true,
    aiChoice: "allow",
    aiChoiceAt: "2026-10-15T01:02:03.000Z",
    aiNoticeVersion: AI_NOTICE_VERSION,
  };
  assert.equal(aiProcessingAllowed(allowed), true);
  assert.equal(needsAiChoice(allowed), false);
  assert.equal(
    needsAiChoice({ ...allowed, aiChoice: "decline", allowAI: false }),
    false,
  );
});

test("AI notices name OpenRouter and do not claim the provider discards or ignores training", () => {
  const keys = ["aiChoiceBody", "aiPrivacy", "aiOffNote", "keepRecordingNote", "speechNeedsConsent", "aiChoiceAllow", "aiChoiceDecline", "keepRecording"];
  for (const locale of ["en", "zh-Hant", "zh-Hans"]) {
    const title = translate(locale, "aiChoiceTitle");
    const body = translate(locale, "aiChoiceBody");
    assert.match(body, /OpenRouter/);
    assert.match(body, /qwen\/qwen3\.8-omni-flash/);
    assert.equal(translate(locale, "aiChoiceAllow").length > 0, true);
    assert.equal(translate(locale, "aiChoiceDecline").length > 0, true);
    assert.match(translate(locale, "keepRecording"), /./);
    const joined = keys.map((key) => translate(locale, key)).join("\n") + "\n" + title;
    assert.equal(/not used for training|aren't used for training|不用作訓練|不用作训练|不会用于训练|不會用於訓練/i.test(joined), false);
    assert.equal(/OpenRouter[^.]{0,80}(does not store|do not store|won't store|不保存|不會保存|不会保存)/i.test(joined), false);
  }
});

test("consent, refusal, and recording retention are enforced on the server", { timeout: 180000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-ai-consent-"));
  const file = join(dir, "state.sqlite");
  const hits = [];
  const mock = createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      hits.push(body);
      const content = body.includes("input_audio")
        ? "Please bring bottled water."
        : JSON.stringify({
            urgency_level: "LOW",
            category: "NON_MEDICAL",
            summary: "Bring bottled water",
            dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
            requirements: ["Buy water"],
            tools: [],
            resources: ["Bottled water"],
          });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
  });
  await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
  const mockPort = mock.address().port;
  const seeded = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", seedScript],
    {
      cwd: root,
      env: { ...process.env, CARECALL_DB_PATH: file },
      encoding: "utf8",
    },
  );
  assert.equal(seeded.status, 0, seeded.stderr);
  const port = 47341;
  const base = "http://127.0.0.1:" + port;
  let logs = "";
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: root,
      env: {
        ...process.env,
        CARECALL_DB_PATH: file,
        CARECALL_PUBLIC_ORIGIN: base,
        OPENROUTER_API_KEY: "test-key",
        OPENROUTER_API_BASE: "http://127.0.0.1:" + mockPort,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });
  const password = "test-password-1";
  try {
    await waitForHealth(base);
    const historical = await login(base, "61110001", "resident", password);
    assert.equal(historical.user.privacy.allowAI, true);
    assert.equal(historical.user.privacy.aiChoiceAt, undefined);
    assert.equal(needsAiChoice(historical.user.privacy), true);
    assert.equal(aiProcessingAllowed(historical.user.privacy), false);
    const beforeHistorical = hits.length;
    const historicalRequest = await sendText(base, historical.cookie, "Please buy two bottles of water.");
    assert.equal(historicalRequest.status, 201);
    assert.equal(historicalRequest.body.urgency_level, "NOT_ASSESSED");
    assert.equal(historicalRequest.body.source, "fallback");
    assert.notEqual(historicalRequest.body.urgency_level, "LOW");
    assert.equal(hits.length, beforeHistorical);

    const created = await create(base, "61110002", "resident");
    assert.equal(created.user.privacy.allowAI, false);
    assert.equal(created.user.privacy.aiChoice, undefined);
    assert.equal(created.user.privacy.aiChoiceAt, undefined);
    assert.equal(needsAiChoice(created.user.privacy), true);
    const manual = await sendText(base, created.cookie, "Please carry two boxes upstairs.");
    assert.equal(manual.status, 201);
    assert.equal(manual.body.urgency_level, "NOT_ASSESSED");
    assert.equal(manual.body.category, "OTHER");
    assert.equal(manual.body.source, "fallback");
    assert.equal(manual.body.audioData, undefined);
    const speechDenied = await sendAudio(base, created.cookie, "/api/speech", false);
    assert.equal(speechDenied.status, 403);
    const audioDenied = await sendAudio(base, created.cookie, "/api/triage", false, "Please bring a lamp.");
    assert.equal(audioDenied.status, 201);
    assert.equal(audioDenied.body.audioData, undefined);
    assert.equal(audioDenied.body.urgency_level, "NOT_ASSESSED");
    assert.equal(databaseHas(file, markerB64), false);
    assert.equal(hits.length, beforeHistorical);

    const allowed = await choose(base, created.cookie, "allow");
    assert.equal(allowed.privacy.aiChoice, "allow");
    assert.equal(allowed.privacy.allowAI, true);
    assert.equal(allowed.privacy.aiNoticeVersion, AI_NOTICE_VERSION);
    assert.equal(Number.isNaN(Date.parse(allowed.privacy.aiChoiceAt)), false);
    assert.equal(allowed.privacy.aiChoiceAt.startsWith("2026-09-01"), false);
    const transcribed = await sendAudio(base, created.cookie, "/api/speech", false);
    assert.equal(transcribed.status, 200);
    assert.equal(transcribed.body.transcript, "Please bring bottled water.");
    assert.equal(hits.some((body) => body.includes("input_audio")), true);
    const unkept = await sendAudio(base, created.cookie, "/api/triage", false, "");
    assert.equal(unkept.status, 201, JSON.stringify(unkept.body));
    assert.equal(unkept.body.transcript, "Please bring bottled water.");
    assert.equal(unkept.body.audioData, undefined);
    const detail = await getStatus(base, created.cookie, unkept.body.id);
    assert.equal(detail.audioData, undefined);
    assert.equal(databaseHas(file, markerB64), false);

    const volunteer = await create(base, "61110003", "volunteer");
    const stranger = await create(base, "61110004", "volunteer");
    const kept = await sendAudio(base, created.cookie, "/api/triage", true, "Please bring a flashlight upstairs.");
    assert.equal(kept.status, 201, JSON.stringify(kept.body));
    assert.match(kept.body.audioData || "", /data:audio\/wav;base64,/);
    assert.equal(databaseHas(file, markerB64), true);
    const residentView = await getStatus(base, created.cookie, kept.body.id);
    assert.match(residentView.audioData, /data:audio\/wav;base64,/);
    assert.equal((await shift(base, volunteer.cookie, true)).status, 200);
    const nearby = await tasks(base, volunteer.cookie);
    assert.equal(JSON.stringify(nearby).includes(markerB64), false);
    assert.equal(JSON.stringify(nearby).includes("audioData"), false);
    assert.equal((await getStatus(base, volunteer.cookie, kept.body.id)).error, "notFound");
    const accepted = await accept(base, volunteer.cookie, kept.body.id);
    assert.equal(accepted.status, 200);
    const volunteerView = await getStatus(base, volunteer.cookie, kept.body.id);
    assert.match(volunteerView.audioData, /data:audio\/wav;base64,/);
    assert.equal((await getStatus(base, stranger.cookie, kept.body.id)).error, "notFound");

    const hitsBeforeDecline = hits.length;
    const declined = await choose(base, created.cookie, "decline");
    assert.equal(declined.privacy.allowAI, false);
    assert.equal(declined.privacy.aiChoice, "decline");
    assert.notEqual(declined.privacy.aiChoiceAt, allowed.privacy.aiChoiceAt);
    const afterDecline = await sendText(base, created.cookie, "Please buy rice tonight.");
    assert.equal(afterDecline.status, 201);
    assert.equal(afterDecline.body.urgency_level, "NOT_ASSESSED");
    assert.equal(afterDecline.body.source, "fallback");
    const speechAfter = await sendAudio(base, created.cookie, "/api/speech", false);
    assert.equal(speechAfter.status, 403);
    assert.equal(hits.length, hitsBeforeDecline);
    assert.equal(databaseHas(file, oldClip), true);
    assert.equal(logs.includes(marker), false);
    assert.equal(logs.includes(markerB64), false);
  } finally {
    if (server.pid && process.platform === "win32") spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"]);
    else server.kill();
    await new Promise((resolve) => {
      if (server.exitCode !== null) resolve();
      else server.once("exit", resolve);
    });
    mock.close();
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        rmSync(dir, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }
});

const seedScript = `
import { hashPassword } from "./lib/passwords.ts";
import { writeSnapshot } from "./lib/persistence.mjs";
const passwordHash = await hashPassword("test-password-1");
writeSnapshot({
  users: [{
    id: "historical-resident",
    name: "Historical Resident",
    phone: "+85261110001",
    role: "resident",
    privacy: { allowCalls: false, allowAI: true, allowChat: true, showName: false, shareAddress: false, shareLocation: false, allowLocation: false },
    passwordHash,
    privacyAcceptedAt: "2026-09-01T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
  }],
  sessions: [],
  requests: [{
    id: "old-recording",
    residentId: "historical-resident",
    lat: 22.3,
    lng: 114.1,
    status: "PENDING",
    urgency_level: "LOW",
    category: "NON_MEDICAL",
    summary: "Old recording",
    dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
    createdAt: "2026-09-02T00:00:00.000Z",
    source: "fallback",
    audioStatus: "provided",
    imageStatus: "none",
    audioData: ${JSON.stringify(oldClip)},
  }],
  messages: [],
});
`;

function databaseHas(file, needle) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const rows = db.prepare("SELECT audio_data, payload FROM carecall_requests, carecall_state").all();
    return JSON.stringify(rows).includes(needle);
  } finally {
    db.close();
  }
}

async function waitForHealth(base) {
  const started = Date.now();
  while (Date.now() - started < 90000) {
    const response = await fetch(base + "/api/health").catch(() => null);
    if (response?.ok) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("CareCall test server did not start");
}

async function post(base, path, cookie, body) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: {
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

async function create(base, phone, role) {
  const created = await post(base, "/api/auth", "", {
    mode: "create",
    name: "Consent " + role,
    phone,
    role,
    privacyAccepted: true,
    password: "test-password-1",
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  return { cookie: created.cookie, user: created.body.user };
}

async function login(base, phone, role, password) {
  const session = await post(base, "/api/auth", "", { mode: "login", phone, role, password });
  assert.equal(session.status, 200, JSON.stringify(session.body));
  return { cookie: session.cookie, user: session.body.user };
}

function requestForm(text, keep) {
  const form = new FormData();
  form.set("lat", "22.3");
  form.set("lng", "114.1");
  form.set("text", text);
  form.set("locale", "en");
  if (keep) {
    form.set("audio", new Blob([marker], { type: "audio/wav" }), "voice.wav");
    form.set("keepAudio", "1");
  }
  return form;
}

async function sendText(base, cookie, text) {
  return post(base, "/api/triage", cookie, requestForm(text, false));
}

async function sendAudio(base, cookie, path, keep, text = "") {
  const form = new FormData();
  form.set("audio", new Blob([marker], { type: "audio/wav" }), "voice.wav");
  form.set("locale", "en");
  if (path === "/api/triage") {
    form.set("lat", "22.3");
    form.set("lng", "114.1");
    form.set("text", text);
    if (keep) form.set("keepAudio", "1");
  }
  return post(base, path, cookie, form);
}

async function choose(base, cookie, choice) {
  const saved = await post(base, "/api/account/ai-choice", cookie, { choice });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  return saved.body.user;
}

async function getStatus(base, cookie, id) {
  const response = await fetch(base + "/api/request/status?id=" + id, {
    headers: { Cookie: cookie, Origin: base },
  });
  return response.json();
}

async function tasks(base, cookie) {
  const response = await fetch(base + "/api/volunteer/tasks?lat=22.3&lng=114.1", {
    headers: { Cookie: cookie, Origin: base },
  });
  return response.json();
}

async function shift(base, cookie, available) {
  const response = await fetch(base + "/api/volunteer/shift", {
    method: "PATCH",
    headers: { Cookie: cookie, Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ available }),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function accept(base, cookie, id) {
  return post(base, "/api/volunteer/accept", cookie, { id, lat: 22.3, lng: 114.1 });
}
