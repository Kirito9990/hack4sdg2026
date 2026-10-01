import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("session authentication reads SQLite and leaves the JSON backup in place", () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-session-read-"));
  const file = join(dir, "state.sqlite");
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", sessionScript],
    {
      cwd: root,
      env: { ...process.env, CARECALL_DB_PATH: file },
      encoding: "utf8",
    },
  );
  try {
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.sqliteSession.userId, "resident");
    assert.equal(report.sqliteSession.passwordAuth, true);
    assert.equal(report.jsonOnly, null);
    assert.equal(report.legacy, null);
    assert.equal(report.expired, null);
    assert.equal(report.missing, null);
    assert.equal(report.payloadUnchanged, true);
    assert.deepEqual(report.requests, ["req"]);
    assert.deepEqual(report.messages, ["msg"]);
    assert.equal(report.afterLogout, null);
    assert.equal(report.backupStill.userId, "resident");
    assert.deepEqual(report.jsonSessions, ["backup", "expired"]);
    assert.deepEqual(report.messageTexts, ["hello"]);
    assert.deepEqual(report.requestSummaries, ["Keep"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const sessionScript = `
import { DatabaseSync } from "node:sqlite";
import { loadSnapshot, readPasswordSession, writeSnapshot } from "./lib/persistence.mjs";
const created = new Date().toISOString();
const request = { id: "req", residentId: "resident", lat: 22.3, lng: 114.1, status: "PENDING", urgency_level: "LOW", category: "OTHER", summary: "Keep", dispatch_action: "NEIGHBORHOOD_VOLUNTEER", createdAt: created, source: "fallback" };
const message = { id: "msg", requestId: "req", senderId: "resident", text: "hello", createdAt: created };
writeSnapshot({
  users: [{ id: "resident", name: "Ada", phone: "+85260002222", role: "resident", createdAt: created, privacy: { allowChat: true, allowCalls: false, allowAI: false } }],
  sessions: [{ id: "backup", userId: "resident", createdAt: created, passwordAuth: true }],
  requests: [request],
  messages: [message],
});
const db = new DatabaseSync(process.env.CARECALL_DB_PATH);
const payload = JSON.parse(db.prepare("SELECT payload FROM carecall_state WHERE id=1").get().payload);
payload.sessions.push({ id: "json-only", userId: "resident", createdAt: created, passwordAuth: true });
db.prepare("UPDATE carecall_state SET payload=? WHERE id=1").run(JSON.stringify(payload));
db.prepare("INSERT INTO carecall_sessions(id,user_id,created_at,password_auth) VALUES(?,?,?,1)").run("sqlite-only", "resident", created);
db.prepare("INSERT INTO carecall_sessions(id,user_id,created_at,password_auth) VALUES(?,?,?,0)").run("legacy", "resident", created);
db.prepare("INSERT INTO carecall_sessions(id,user_id,created_at,password_auth) VALUES(?,?,?,1)").run("expired", "resident", new Date(Date.now()-31*86400000).toISOString());
const before = db.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
const sqliteSession = readPasswordSession("sqlite-only");
const jsonOnly = readPasswordSession("json-only");
const legacy = readPasswordSession("legacy");
const expired = readPasswordSession("expired");
const missing = readPasswordSession(undefined);
const afterRead = db.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
db.close();
const data = loadSnapshot();
data.sessions = data.sessions.filter((session) => session.id !== "sqlite-only");
writeSnapshot(data);
const saved = loadSnapshot();
console.log(JSON.stringify({
  sqliteSession,
  jsonOnly,
  legacy,
  expired,
  missing,
  payloadUnchanged: before.payload === afterRead.payload && before.revision === afterRead.revision,
  requests: JSON.parse(before.payload).requests.map((item) => item.id),
  messages: JSON.parse(before.payload).messages.map((item) => item.id),
  afterLogout: readPasswordSession("sqlite-only"),
  backupStill: readPasswordSession("backup"),
  jsonSessions: saved.sessions.map((session) => session.id),
  requestSummaries: saved.requests.map((item) => item.summary),
  messageTexts: saved.messages.map((item) => item.text),
}));
`;
