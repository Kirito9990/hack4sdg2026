import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("request reads come from SQLite in snapshot order and leave the JSON backup unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-request-read-"));
  const file = join(dir, "state.sqlite");
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", requestScript], {
    cwd: root,
    env: { ...process.env, CARECALL_DB_PATH: file },
    encoding: "utf8",
  });
  try {
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.payloadUnchanged, true);
    assert.deepEqual(report.loadedIds, ["beta", "alpha", "sparse", "sqlite-only"]);
    assert.deepEqual(report.backupIds, ["alpha", "beta"]);
    assert.equal(report.beta.volunteerId, "volunteer");
    assert.equal(report.beta.status, "ACCEPTED");
    assert.equal(report.beta.urgency_level, "LOW");
    assert.equal(report.beta.category, "NON_MEDICAL");
    assert.equal(report.beta.createdAt, "2026-10-01T03:00:00.000Z");
    assert.equal(report.beta.acceptedAt, "2026-10-01T04:00:00.000Z");
    assert.equal(report.beta.imageData, "data:image/jpeg;base64,abc");
    assert.equal(report.beta.transcript, "I need water");
    assert.deepEqual(report.beta.classification, {
      category: "NON_MEDICAL",
      urgency: "LOW",
      safety_level: "NEIGHBORHOOD_VOLUNTEER",
      matching_tags: ["water"],
      summary: "Bring water",
    });
    assert.equal(report.sparse.volunteerId, undefined);
    assert.equal(report.sparse.classification, undefined);
    assert.equal(report.sparse.imageData, undefined);
    assert.equal(report.sparse.transcript, undefined);
    assert.equal(report.sparse.audioStatus, undefined);
    assert.equal(report.sparse.imageStatus, undefined);
    assert.equal(report.sparse.status, "PENDING");
    assert.equal(report.sparse.urgency_level, "NOT_ASSESSED");
    assert.equal(report.sparse.category, "OTHER");
    assert.equal(report.sqliteOnly.imageData, "data:image/jpeg;base64,abc");
    assert.equal(report.sqliteOnly.summary, "Table only");
    assert.deepEqual(report.messages, ["hello"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const requestScript = `
import { DatabaseSync } from "node:sqlite";
import { loadSnapshot, writeSnapshot } from "./lib/persistence.mjs";
const image = "data:image/jpeg;base64,abc";
const classification = { category: "NON_MEDICAL", urgency: "LOW", safety_level: "NEIGHBORHOOD_VOLUNTEER", matching_tags: ["water"], summary: "Bring water" };
const alpha = { id: "alpha", residentId: "resident", lat: 22.3, lng: 114.1, status: "PENDING", urgency_level: "NOT_ASSESSED", category: "OTHER", summary: "First", dispatch_action: "NEIGHBORHOOD_VOLUNTEER", createdAt: "2026-10-01T01:00:00.000Z", source: "fallback" };
const beta = { id: "beta", residentId: "resident", volunteerId: "volunteer", lat: 22.31, lng: 114.17, status: "ACCEPTED", urgency_level: "LOW", category: "NON_MEDICAL", summary: "Bring water", dispatch_action: "NEIGHBORHOOD_VOLUNTEER", requirements: ["Carry water"], tools: [], resources: ["Bottled water"], createdAt: "2026-10-01T03:00:00.000Z", acceptedAt: "2026-10-01T04:00:00.000Z", source: "openrouter", classification, audioStatus: "transcribed", imageStatus: "analyzed", imageData: image, transcript: "I need water" };
writeSnapshot({
  users: [{ id: "resident", name: "Ada", phone: "+85260003333", role: "resident", createdAt: "2026-10-01T00:00:00.000Z", privacy: { allowChat: true } }],
  sessions: [],
  requests: [alpha, beta],
  messages: [{ id: "msg", requestId: "alpha", senderId: "resident", text: "hello", createdAt: "2026-10-01T01:00:00.000Z" }],
});
const db = new DatabaseSync(process.env.CARECALL_DB_PATH);
db.prepare("UPDATE carecall_requests SET position=1 WHERE id='alpha'").run();
db.prepare("UPDATE carecall_requests SET position=0 WHERE id='beta'").run();
db.prepare("INSERT INTO carecall_requests(id,resident_id,volunteer_id,lat,lng,status,urgency_level,category,summary,dispatch_action,requirements_json,tools_json,resources_json,created_at,accepted_at,chat_expires_at,closed_at,closed_reason,image_data,transcript,source,classification_json,audio_status,image_status,image_width,image_height,position) VALUES('sparse','resident',NULL,22.2,114.2,'PENDING','NOT_ASSESSED','OTHER','Sparse','NEIGHBORHOOD_VOLUNTEER',NULL,NULL,NULL,'2026-10-01T05:00:00.000Z',NULL,NULL,NULL,NULL,NULL,NULL,'fallback',NULL,NULL,NULL,NULL,NULL,2)").run();
db.prepare("INSERT INTO carecall_requests(id,resident_id,volunteer_id,lat,lng,status,urgency_level,category,summary,dispatch_action,requirements_json,tools_json,resources_json,created_at,accepted_at,chat_expires_at,closed_at,closed_reason,image_data,transcript,source,classification_json,audio_status,image_status,image_width,image_height,position) VALUES('sqlite-only','resident','volunteer',22.4,114.3,'PENDING','LOW','MOBILITY','Table only','NEIGHBORHOOD_VOLUNTEER',NULL,NULL,NULL,'2026-10-01T06:00:00.000Z',NULL,NULL,NULL,NULL,?,'Need a ramp','fallback',?,NULL,'prepared',NULL,NULL,3)").run(image, JSON.stringify(classification));
const before = db.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
db.close();
const loaded = loadSnapshot();
const after = new DatabaseSync(process.env.CARECALL_DB_PATH, { readOnly: true });
const stored = after.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
after.close();
const backup = JSON.parse(stored.payload);
const byId = Object.fromEntries(loaded.requests.map((request) => [request.id, request]));
console.log(JSON.stringify({
  payloadUnchanged: before.payload === stored.payload && before.revision === stored.revision,
  loadedIds: loaded.requests.map((request) => request.id),
  backupIds: backup.requests.map((request) => request.id),
  beta: byId.beta,
  sparse: byId.sparse,
  sqliteOnly: byId["sqlite-only"],
  messages: loaded.messages.map((message) => message.text),
}));
`;
