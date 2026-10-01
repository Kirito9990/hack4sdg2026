import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const image = "data:image/jpeg;base64,abc";
const classification = {
  category: "NON_MEDICAL",
  urgency: "LOW",
  safety_level: "NEIGHBORHOOD_VOLUNTEER",
  matching_tags: ["water"],
  summary: "Bring water",
};

function child(file, code) {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: root,
    env: { ...process.env, CARECALL_DB_PATH: file },
    encoding: "utf8",
  });
  return result;
}

function seed(file, payload) {
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE carecall_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, revision INTEGER NOT NULL);
CREATE TABLE carecall_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE carecall_users (
 id TEXT PRIMARY KEY, name TEXT, phone TEXT, role TEXT, available INTEGER, address TEXT,
 privacy_accepted_at TEXT, created_at TEXT, password_hash TEXT);
CREATE TABLE carecall_privacy (
 user_id TEXT PRIMARY KEY, allow_calls INTEGER, allow_ai INTEGER, allow_chat INTEGER,
 show_name INTEGER, share_address INTEGER, share_location INTEGER, allow_location INTEGER);`);
  db.prepare("INSERT INTO carecall_state(id,payload,revision) VALUES(1,?,1)").run(payload);
  db.prepare(
    "INSERT INTO carecall_users(id,name,phone,role,created_at,password_hash) VALUES(?,?,?,?,?,?)",
  ).run("resident", "Ada", "+85260001111", "resident", "2026-10-01T00:00:00.000Z", null);
  db.prepare(
    "INSERT INTO carecall_privacy(user_id,allow_calls,allow_ai,allow_chat,show_name,share_address,share_location,allow_location) VALUES(?,?,?,?,?,?,?,?)",
  ).run("resident", null, null, null, null, null, null, null);
  db.prepare("INSERT INTO carecall_meta(key,value) VALUES('user_tables','1')").run();
  db.close();
}

function counts(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  const read = (sql) => db.prepare(sql).all();
  const one = (sql) => db.prepare(sql).get();
  const result = {
    payload: one("SELECT payload,revision FROM carecall_state WHERE id=1"),
    flag: one("SELECT value FROM carecall_meta WHERE key='snapshot_tables'"),
    privacy: one("SELECT allow_calls,allow_ai,show_name FROM carecall_privacy WHERE user_id='resident'"),
    sessions: read("SELECT id FROM carecall_sessions ORDER BY rowid"),
    requests: read(
      "SELECT id,position,image_data,classification_json,audio_status,image_status,summary FROM carecall_requests ORDER BY position",
    ),
    messages: read(
      "SELECT id,position,image_data,text FROM carecall_messages ORDER BY position",
    ),
  };
  db.close();
  return result;
}

test("existing JSON snapshot migrates into tables and later writes update both copies", () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-migrate-"));
  const file = join(dir, "state.sqlite");
  const data = {
    users: [],
    sessions: [
      { id: "legacy", userId: "resident", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "current", userId: "resident", createdAt: "2026-10-01T01:00:00.000Z", passwordAuth: true },
      { id: "also", userId: "resident", createdAt: "2026-10-01T02:00:00.000Z", passwordAuth: true },
    ],
    requests: [
      {
        id: "old",
        residentId: "resident",
        lat: 22.3,
        lng: 114.1,
        status: "CLOSED",
        urgency_level: "LOW",
        category: "OTHER",
        summary: "Old request",
        dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
        createdAt: "2026-10-01T00:00:00.000Z",
        source: "fallback",
        imageData: image,
      },
      {
        id: "new",
        residentId: "resident",
        lat: 22.31,
        lng: 114.17,
        status: "PENDING",
        urgency_level: "LOW",
        category: "NON_MEDICAL",
        summary: "Bring water",
        dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
        requirements: ["Carry water"],
        tools: [],
        resources: ["Bottled water"],
        createdAt: "2026-10-01T03:00:00.000Z",
        source: "openrouter",
        classification,
        audioStatus: "transcribed",
        imageStatus: "analyzed",
        transcript: "I need water",
      },
    ],
    messages: [
      { id: "m1", requestId: "old", senderId: "resident", text: "first", imageData: image, createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "m2", requestId: "new", senderId: "resident", text: "second", createdAt: "2026-10-01T03:00:00.000Z" },
    ],
  };
  const payload = JSON.stringify(data);
  seed(file, payload);
  try {
    const migrated = child(
      file,
      'import {migrateSnapshotTables} from "./lib/persistence.mjs";console.log(JSON.stringify(migrateSnapshotTables()));',
    );
    assert.equal(migrated.status, 0, migrated.stderr);
    assert.deepEqual(JSON.parse(migrated.stdout), { migrated: true, sessions: 2, requests: 2, messages: 2 });
    const stored = counts(file);
    assert.equal(stored.payload.payload, payload);
    assert.equal(stored.payload.revision, 1);
    assert.equal(stored.flag.value, "1");
    assert.equal(stored.privacy.allow_calls, null);
    assert.equal(stored.privacy.allow_ai, null);
    assert.equal(stored.privacy.show_name, null);
    assert.deepEqual(stored.sessions.map((row) => row.id), ["current", "also"]);
    assert.equal(stored.requests.length, 2);
    assert.equal(stored.messages.length, 2);
    assert.equal(stored.requests[0].position, 0);
    assert.equal(stored.requests[1].position, 1);
    assert.equal(stored.requests[0].image_data, image);
    assert.equal(stored.requests[0].classification_json, null);
    assert.equal(stored.requests[0].audio_status, null);
    assert.equal(stored.requests[0].image_status, null);
    assert.deepEqual(JSON.parse(stored.requests[1].classification_json), classification);
    assert.equal(stored.messages[0].image_data, image);
    assert.equal(stored.messages[0].position, 0);
    assert.equal(stored.messages[1].position, 1);
    const read = child(
      file,
      'import {DatabaseSync} from "node:sqlite";const db=new DatabaseSync(process.env.CARECALL_DB_PATH);db.prepare("UPDATE carecall_requests SET summary=? WHERE id=?").run("changed in table only","old");db.close();const {loadSnapshot}=await import("./lib/persistence.mjs");console.log(loadSnapshot().requests.find(request=>request.id==="old").summary);',
    );
    assert.equal(read.status, 0, read.stderr);
    assert.equal(read.stdout.trim(), "Old request");
    const dual = child(
      file,
      'const {loadSnapshot,writeSnapshot}=await import("./lib/persistence.mjs");const data=loadSnapshot();data.messages.push({id:"m3",requestId:"old",senderId:"resident",text:"third",createdAt:"2026-10-01T04:00:00.000Z"});writeSnapshot(data);console.log("ok");',
    );
    assert.equal(dual.status, 0, dual.stderr);
    const after = counts(file);
    assert.equal(after.messages.length, 3);
    assert.equal(after.messages[2].text, "third");
    assert.equal(JSON.parse(after.payload.payload).messages.length, 3);
    assert.equal(after.requests[0].image_data, image);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("snapshot migration rolls back when a table copy fails", () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-rollback-"));
  const file = join(dir, "state.sqlite");
  const request = {
    id: "same",
    residentId: "resident",
    lat: 22.3,
    lng: 114.1,
    status: "PENDING",
    urgency_level: "LOW",
    category: "OTHER",
    summary: "Duplicate",
    dispatch_action: "NEIGHBORHOOD_VOLUNTEER",
    createdAt: "2026-10-01T00:00:00.000Z",
    source: "fallback",
    imageData: image,
  };
  const data = {
    users: [],
    sessions: [
      { id: "legacy", userId: "resident", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "current", userId: "resident", createdAt: "2026-10-01T01:00:00.000Z", passwordAuth: true },
    ],
    requests: [request, { ...request }],
    messages: [
      { id: "m1", requestId: "same", senderId: "resident", text: "kept", imageData: image, createdAt: "2026-10-01T00:00:00.000Z" },
    ],
  };
  const payload = JSON.stringify(data);
  seed(file, payload);
  try {
    const failed = child(
      file,
      'import {migrateSnapshotTables} from "./lib/persistence.mjs";try{migrateSnapshotTables();process.exit(2);}catch(error){console.log(error.message);}',
    );
    assert.equal(failed.status, 0, failed.stderr);
    assert.match(failed.stdout, /UNIQUE constraint failed/i);
    const stored = counts(file);
    assert.equal(stored.payload.payload, payload);
    assert.equal(stored.payload.revision, 1);
    assert.equal(stored.flag, undefined);
    assert.equal(stored.sessions.length, 0);
    assert.equal(stored.requests.length, 0);
    assert.equal(stored.messages.length, 0);
    assert.equal(stored.privacy.allow_calls, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
