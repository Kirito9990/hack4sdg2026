import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { shareVoiceNote } from "../lib/request-content.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const clip = "data:audio/webm;base64,T2s";

test("a voice note is kept by the resident and given to a volunteer only after acceptance", () => {
  assert.equal(
    shareVoiceNote({
      status: "PENDING",
      audioData: clip,
      userId: "resident",
      residentId: "resident",
    }),
    true,
  );
  assert.equal(
    shareVoiceNote({
      status: "PENDING",
      audioData: clip,
      userId: "volunteer",
      residentId: "resident",
    }),
    false,
  );
  assert.equal(
    shareVoiceNote({
      status: "ACCEPTED",
      audioData: clip,
      userId: "volunteer",
      residentId: "resident",
      volunteerId: "volunteer",
    }),
    true,
  );
  assert.equal(
    shareVoiceNote({
      status: "ACCEPTED",
      audioData: clip,
      userId: "other",
      residentId: "resident",
      volunteerId: "volunteer",
    }),
    false,
  );
  assert.equal(
    shareVoiceNote({
      status: "CLOSED",
      audioData: clip,
      userId: "volunteer",
      residentId: "resident",
      volunteerId: "volunteer",
    }),
    false,
  );
});

test("a stored voice note survives a database restart", () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-voice-"));
  const file = join(dir, "state.sqlite");
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", voiceScript],
    {
      cwd: root,
      env: { ...process.env, CARECALL_DB_PATH: file },
      encoding: "utf8",
    },
  );
  try {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).audioData, clip);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const voiceScript = `
import { writeSnapshot, loadSnapshot } from "./lib/persistence.mjs";
const clip = ${JSON.stringify(clip)};
writeSnapshot({
  users: [],
  sessions: [],
  messages: [],
  requests: [{
    id: "voice",
    residentId: "resident",
    lat: 22.3,
    lng: 114.1,
    status: "PENDING",
    urgency_level: "LOW",
    category: "OTHER",
    summary: "Please buy rice",
    dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
    createdAt: "2026-10-12T00:00:00.000Z",
    source: "fallback",
    audioStatus: "provided",
    audioData: clip,
  }],
});
const loaded = loadSnapshot();
console.log(JSON.stringify({ audioData: loaded.requests[0].audioData }));
`;
