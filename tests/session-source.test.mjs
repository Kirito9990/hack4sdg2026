import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function run(file, code) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: root,
    env: { ...process.env, CARECALL_DB_PATH: file },
    encoding: "utf8",
  });
}

test("session creates and logouts are stored in SQLite and copied to the JSON backup", () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-session-source-"));
  const file = join(dir, "state.sqlite");
  const result = run(file, createScript);
  try {
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.afterCreate.sqlite, ["live"]);
    assert.deepEqual(report.afterCreate.backup, ["live"]);
    assert.equal(report.afterCreate.auth.userId, "resident");
    assert.deepEqual(report.afterLogout.sqlite, []);
    assert.deepEqual(report.afterLogout.backup, []);
    assert.equal(report.afterLogout.auth, null);
    assert.deepEqual(report.afterAccountDelete.sqlite, []);
    assert.deepEqual(report.afterAccountDelete.backup, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a restarted read uses SQLite sessions and ignores a stale JSON session", () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-session-restart-"));
  const file = join(dir, "state.sqlite");
  try {
    const created = run(file, seedScript);
    assert.equal(created.status, 0, created.stderr);
    const db = new DatabaseSync(file);
    const payload = JSON.parse(db.prepare("SELECT payload FROM carecall_state WHERE id=1").get().payload);
    payload.sessions = [
      {
        id: "stale",
        userId: "resident",
        createdAt: "2026-10-01T00:00:00.000Z",
        passwordAuth: true,
      },
    ];
    db.prepare("UPDATE carecall_state SET payload=? WHERE id=1").run(JSON.stringify(payload));
    db.close();
    const restarted = run(file, restartScript);
    assert.equal(restarted.status, 0, restarted.stderr);
    const report = JSON.parse(restarted.stdout);
    assert.deepEqual(report.loaded, ["live"]);
    assert.equal(report.live.userId, "resident");
    assert.equal(report.stale, null);
    assert.deepEqual(report.backup, ["stale"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const user = `{ id: "resident", name: "Ada", phone: "+85260005555", role: "resident", createdAt: "2026-10-01T00:00:00.000Z", privacy: { allowChat: true } }`;

const createScript = `
import { DatabaseSync } from "node:sqlite";
import { loadSnapshot, readPasswordSession, writeSnapshot } from "./lib/persistence.mjs";
const created = new Date().toISOString();
function ids(fileSql){
  const db = new DatabaseSync(process.env.CARECALL_DB_PATH, { readOnly: true });
  const sqlite = db.prepare("SELECT id FROM carecall_sessions ORDER BY rowid").all().map((row) => row.id);
  const backup = JSON.parse(db.prepare("SELECT payload FROM carecall_state WHERE id=1").get().payload).sessions.map((session) => session.id);
  db.close();
  return { sqlite, backup };
}
writeSnapshot({ users: [${user}], sessions: [], requests: [], messages: [] });
const data = loadSnapshot();
data.sessions.push({ id: "live", userId: "resident", createdAt: created, passwordAuth: true });
writeSnapshot(data);
const afterCreate = { ...ids(), auth: readPasswordSession("live") };
const loggedOut = loadSnapshot();
loggedOut.sessions = loggedOut.sessions.filter((session) => session.id !== "live");
writeSnapshot(loggedOut);
const afterLogout = { ...ids(), auth: readPasswordSession("live") };
const again = loadSnapshot();
again.sessions.push({ id: "one", userId: "resident", createdAt: created, passwordAuth: true });
again.sessions.push({ id: "two", userId: "resident", createdAt: created, passwordAuth: true });
writeSnapshot(again);
const deleting = loadSnapshot();
deleting.sessions = deleting.sessions.filter((session) => session.userId !== "resident");
writeSnapshot(deleting);
console.log(JSON.stringify({ afterCreate, afterLogout, afterAccountDelete: ids() }));
`;

const seedScript = `
import { loadSnapshot, writeSnapshot } from "./lib/persistence.mjs";
writeSnapshot({ users: [${user}], sessions: [], requests: [], messages: [] });
const data = loadSnapshot();
data.sessions.push({ id: "live", userId: "resident", createdAt: new Date().toISOString(), passwordAuth: true });
writeSnapshot(data);
`;

const restartScript = `
import { DatabaseSync } from "node:sqlite";
import { loadSnapshot, readPasswordSession } from "./lib/persistence.mjs";
const loaded = loadSnapshot();
const db = new DatabaseSync(process.env.CARECALL_DB_PATH, { readOnly: true });
const backup = JSON.parse(db.prepare("SELECT payload FROM carecall_state WHERE id=1").get().payload);
db.close();
console.log(JSON.stringify({
  loaded: loaded.sessions.map((session) => session.id),
  live: readPasswordSession("live"),
  stale: readPasswordSession("stale"),
  backup: backup.sessions.map((session) => session.id),
}));
`;
