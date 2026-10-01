import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47291";
assert(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Auth tests must stay local",
);
const dbPath =
  process.env.CARECALL_DB_PATH ||
  resolve(process.cwd(), ".carecall-data", "carecall.sqlite");
const password = "test-password-1";
const phone = "7" + String(Date.now()).slice(-7);
const ratePhone = "6" + String(Date.now()).slice(-7);

function cookie(response) {
  const raw = response.headers.get("set-cookie") || "";
  assert.match(raw, /carecall_session=/);
  assert.match(raw, /HttpOnly/i);
  assert.match(raw, /SameSite=Strict/i);
  if (base.startsWith("https:")) assert.match(raw, /Secure/i);
  return raw.split(";")[0];
}

async function post(body) {
  const response = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), response };
}

test("legacy sessions are dropped and an account without a hash cannot be claimed", () => {
  const dir = mkdtempSync(join(tmpdir(), "carecall-legacy-"));
  const file = join(dir, "legacy.sqlite");
  const env = { ...process.env, CARECALL_DB_PATH: file };
  const data = {
    users: [
      {
        id: "old",
        name: "Old Account",
        phone: "+85260008881",
        role: "resident",
        createdAt: "2026-10-01T00:00:00.000Z",
        privacy: { allowCalls: false, allowAI: false, allowChat: true },
      },
    ],
    sessions: [
      { id: "legacy", userId: "old", createdAt: "2026-10-01T00:00:00.000Z" },
      {
        id: "current",
        userId: "old",
        createdAt: "2026-10-01T00:00:00.000Z",
        passwordAuth: true,
      },
    ],
    requests: [],
    messages: [],
  };
  const child = (code) => {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
      env,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  try {
    child(
      'import {loadSnapshot,writeSnapshot} from "./lib/persistence.mjs";loadSnapshot();writeSnapshot(' +
        JSON.stringify(data) +
        ");",
    );
    const loaded = JSON.parse(
      child(
        'import {loadSnapshot} from "./lib/persistence.mjs";console.log(JSON.stringify(loadSnapshot()));',
      ),
    );
    assert.deepEqual(
      loaded.sessions.map((session) => session.id),
      ["current"],
    );
    assert.equal(loaded.users[0].passwordHash, undefined);
    const database = new DatabaseSync(file, { readOnly: true });
    const saved = JSON.parse(
      database.prepare("SELECT payload FROM carecall_state WHERE id=1").get().payload,
    );
    database.close();
    assert.equal(
      saved.sessions.some((session) => session.id === "legacy"),
      false,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("password rules reject missing, oversized, and multi-byte overflow", async () => {
  const { validPassword, passwordAccepted } = await import("../lib/passwords.ts");
  const { hash } = await import("bcryptjs");
  assert.equal(validPassword("short"), false);
  assert.equal(validPassword("a".repeat(73)), false);
  assert.equal(validPassword("é".repeat(40)), false);
  assert.equal(validPassword("a".repeat(72)), true);
  const stored = await hash(password, 12);
  assert.equal(await passwordAccepted(undefined, password), false);
  assert.equal(await passwordAccepted({ passwordHash: undefined }, password), false);
  assert.equal(await passwordAccepted({ passwordHash: stored }, "wrong-password"), false);
  assert.equal(await passwordAccepted({ passwordHash: stored }, password), true);
  assert.equal(stored.includes(password), false);
});

test("password is required before a session cookie is issued", async () => {
  const health = await fetch(base + "/api/health").catch(() => null);
  assert.equal(health?.ok, true, "Start the local CareCall server before this test");
  let session = "";
  try {
    const phoneOnly = await post({ mode: "login", phone, role: "resident" });
    assert.equal(phoneOnly.status, 400);
    assert.equal(phoneOnly.body.error, "invalidPassword");
    assert.equal(phoneOnly.response.headers.get("set-cookie"), null);

    const legacyCreate = await post({
      mode: "continue",
      name: "Legacy Create",
      phone,
      role: "resident",
      privacyAccepted: true,
      password,
    });
    assert.equal(legacyCreate.status, 400);
    assert.equal(legacyCreate.body.error, "invalidCredentials");
    assert.equal(legacyCreate.response.headers.get("set-cookie"), null);

    const created = await post({
      mode: "create",
      name: "Auth Test",
      phone,
      role: "resident",
      privacyAccepted: true,
      password,
    });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    assert.equal(created.body.user.passwordHash, undefined);
    assert.equal(JSON.stringify(created.body).includes(password), false);
    session = cookie(created.response);

    const wrong = await post({
      mode: "login",
      phone,
      role: "resident",
      password: "wrong-password",
    });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.error, "invalidCredentials");
    assert.equal(wrong.response.headers.get("set-cookie"), null);

    const missingAccount = await post({
      mode: "login",
      phone: ratePhone,
      role: "volunteer",
      password,
    });
    assert.equal(missingAccount.status, 400);
    assert.equal(missingAccount.body.error, "invalidCredentials");

    const login = await post({
      mode: "login",
      phone,
      role: "resident",
      password,
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.id, created.body.user.id);
    assert.notEqual(cookie(login.response).split("=")[1], session.split("=")[1]);
    const previous = session;
    session = cookie(login.response);
    const stale = await fetch(base + "/api/request/status", {
      headers: { Cookie: previous },
    });
    assert.equal(stale.status, 200);

    const authed = await fetch(base + "/api/auth", { headers: { Cookie: session } });
    assert.equal((await authed.json()).user.passwordHash, undefined);

    const loggedOut = await fetch(base + "/api/auth", {
      method: "DELETE",
      headers: { Cookie: session, Origin: base },
    });
    assert.equal(loggedOut.status, 200);
    const afterLogout = await fetch(base + "/api/auth", { headers: { Cookie: session } });
    assert.equal((await afterLogout.json()).user, null);
    const protectedRoute = await fetch(base + "/api/request/status", {
      headers: { Cookie: session },
    });
    assert.equal(protectedRoute.status, 401);
    session = previous;

    const guest = await fetch(base + "/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: base },
      body: "{}",
    });
    assert.equal(guest.status, 401);

    const database = new DatabaseSync(dbPath, { readOnly: true });
    const savedPhone = "+852" + phone;
    const row = database
      .prepare("SELECT password_hash FROM carecall_users WHERE phone = ?")
      .get(savedPhone);
    const legacy = database
      .prepare(
        "SELECT phone, role FROM carecall_users WHERE password_hash IS NULL LIMIT 1",
      )
      .get();
    database.close();
    assert.match(row.password_hash, /^\$2[ab]\$12\$/);
    assert.equal(row.password_hash.includes(password), false);
    if (legacy) {
      const localPhone = String(legacy.phone).startsWith("+852")
        ? String(legacy.phone).slice(4)
        : String(legacy.phone);
      const denied = await post({
        mode: "login",
        phone: localPhone,
        role: legacy.role,
        password,
      });
      assert.equal(denied.status, 400);
      assert.equal(denied.body.error, "invalidCredentials");
      assert.equal(denied.response.headers.get("set-cookie"), null);
      const claim = await post({
        mode: "create",
        name: "Claim Attempt",
        phone: localPhone,
        role: legacy.role,
        privacyAccepted: true,
        password,
      });
      assert.equal(claim.status, 400);
      assert.equal(claim.body.error, "accountExists");
      assert.equal(claim.response.headers.get("set-cookie"), null);
    }

    for (let n = 1; n < 8; n++) {
      const attempt = await post({
        mode: "login",
        phone: ratePhone,
        role: "volunteer",
        password,
      });
      assert.equal(attempt.status, 400);
      assert.equal(attempt.body.error, "invalidCredentials");
    }
    const limited = await post({
      mode: "login",
      phone: ratePhone,
      role: "volunteer",
      password,
    });
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error, "tooManyAttempts");
  } finally {
    if (session) {
      await fetch(base + "/api/account", {
        method: "DELETE",
        headers: { Cookie: session, Origin: base },
      });
    }
  }
});
