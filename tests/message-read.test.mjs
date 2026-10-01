import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const image = "data:image/jpeg;base64,abc";

test("message reads come from SQLite in snapshot order and leave the JSON backup unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-message-read-"));
  const file = join(dir, "state.sqlite");
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", messageScript], {
    cwd: root,
    env: { ...process.env, CARECALL_DB_PATH: file },
    encoding: "utf8",
  });
  try {
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.payloadUnchanged, true);
    assert.deepEqual(report.loadedIds, ["photo", "text", "sqlite-only"]);
    assert.deepEqual(report.backupIds, ["text", "photo"]);
    assert.equal(report.photo.senderId, "resident");
    assert.equal(report.photo.text, "");
    assert.equal(report.photo.imageData, image);
    assert.equal(report.photo.createdAt, "2026-10-01T02:00:00.000Z");
    assert.equal(report.text.senderId, "volunteer");
    assert.equal(report.text.text, "On my way");
    assert.equal(report.text.imageData, undefined);
    assert.equal(report.text.createdAt, "2026-10-01T01:00:00.000Z");
    assert.equal(report.sqliteOnly.senderId, "resident");
    assert.equal(report.sqliteOnly.text, "Table only");
    assert.equal(report.sqliteOnly.imageData, image);
    assert.equal(report.sqliteOnly.createdAt, "2026-10-01T03:00:00.000Z");
    assert.equal(report.requestSummary, "Keep");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const messageScript = `
import { DatabaseSync } from "node:sqlite";
import { loadSnapshot, writeSnapshot } from "./lib/persistence.mjs";
const image = "data:image/jpeg;base64,abc";
const request = { id: "req", residentId: "resident", lat: 22.3, lng: 114.1, status: "ACCEPTED", urgency_level: "LOW", category: "OTHER", summary: "Keep", dispatch_action: "NEIGHBORHOOD_VOLUNTEER", createdAt: "2026-10-01T00:00:00.000Z", source: "fallback" };
writeSnapshot({
  users: [{ id: "resident", name: "Ada", phone: "+85260004444", role: "resident", createdAt: "2026-10-01T00:00:00.000Z", privacy: { allowChat: true } }],
  sessions: [],
  requests: [request],
  messages: [
    { id: "text", requestId: "req", senderId: "volunteer", text: "On my way", createdAt: "2026-10-01T01:00:00.000Z" },
    { id: "photo", requestId: "req", senderId: "resident", text: "", imageData: image, createdAt: "2026-10-01T02:00:00.000Z" },
  ],
});
const db = new DatabaseSync(process.env.CARECALL_DB_PATH);
db.prepare("UPDATE carecall_messages SET position=1 WHERE id='text'").run();
db.prepare("UPDATE carecall_messages SET position=0 WHERE id='photo'").run();
db.prepare("INSERT INTO carecall_messages(id,request_id,sender_id,text,image_data,created_at,position) VALUES('sqlite-only','req','resident','Table only',?,'2026-10-01T03:00:00.000Z',2)").run(image);
const before = db.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
db.close();
const loaded = loadSnapshot();
const after = new DatabaseSync(process.env.CARECALL_DB_PATH, { readOnly: true });
const stored = after.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
after.close();
const backup = JSON.parse(stored.payload);
const byId = Object.fromEntries(loaded.messages.map((message) => [message.id, message]));
console.log(JSON.stringify({
  payloadUnchanged: before.payload === stored.payload && before.revision === stored.revision,
  loadedIds: loaded.messages.map((message) => message.id),
  backupIds: backup.messages.map((message) => message.id),
  photo: byId.photo,
  text: byId.text,
  sqliteOnly: byId["sqlite-only"],
  requestSummary: loaded.requests[0].summary,
}));
`;
