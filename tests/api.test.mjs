import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47293";
assert(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Tests must target a local server",
);
const clients = [];
async function client(role, name) {
  const response = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone: "61234567", role }),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  const { user } = await response.json(),
    cookie = response.headers.get("set-cookie").split(";")[0];
  const call = async (
    path,
    body,
    method = body === undefined ? "GET" : "POST",
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        Cookie: cookie,
        Origin: base,
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const result = { user, call };
  clients.push(result);
  return result;
}
function form(text = "Need help carrying supplies") {
  const f = new FormData();
  f.set("lat", "22.3193");
  f.set("lng", "114.1694");
  f.set("text", text);
  return f;
}
test("session, matching, media and privacy integration", async (t) => {
  try {
    const anonymous = await fetch(base + "/api/request/status");
    assert.equal(anonymous.status, 401);
    const resident = await client("resident", "Resident Test"),
      other = await client("resident", "Other Resident"),
      a = await client("volunteer", "Volunteer A"),
      b = await client("volunteer", "Volunteer B");
    let created;
    await t.test(
      "server owns identity and broadcasts no contact or exact coordinates",
      async () => {
        const f = form("Resident Test at +85261234567 needs supplies");
        f.set("residentName", "Spoof");
        f.set("residentPhone", "+8612345678901");
        created = await resident.call("/api/triage", f);
        assert.equal(created.status, 201);
        assert.equal(created.body.residentId, resident.user.id);
        assert.equal(created.body.source, "fallback");
        assert(!created.body.summary.includes("61234567"));
        const list = await a.call(
          "/api/volunteer/tasks?lat=22.3193&lng=114.1694",
        );
        const task = list.body.tasks.find((x) => x.id === created.body.id);
        assert(task);
        assert.equal(task.lat, 22.32);
        assert.equal(task.lng, 114.17);
        for (const key of [
          "residentName",
          "residentPhone",
          "residentId",
          "transcript",
          "summary",
        ])
          assert(!(key in task));
        assert.equal(
          (await other.call("/api/request/status?id=" + created.body.id))
            .status,
          404,
        );
        assert.equal(
          (await resident.call("/api/volunteer/tasks?lat=22.3193&lng=114.1694"))
            .status,
          403,
        );
      },
    );
    let winner, loser;
    await t.test(
      "only one concurrent acceptance succeeds and resident sees the match",
      async () => {
        const args = { id: created.body.id, lat: 22.3193, lng: 114.1694 };
        const replies = await Promise.all([
          a.call("/api/volunteer/accept", args),
          b.call("/api/volunteer/accept", args),
        ]);
        assert.deepEqual(replies.map((x) => x.status).sort(), [200, 409]);
        winner = replies[0].status === 200 ? a : b;
        loser = winner === a ? b : a;
        const status = await resident.call(
          "/api/request/status?id=" + created.body.id,
        );
        assert.equal(status.body.volunteerId, winner.user.id);
        assert.equal(status.body.status, "ACCEPTED");
        assert.equal(status.body.callPhone, null);
        assert.equal(
          (await loser.call("/api/request/status?id=" + created.body.id))
            .status,
          404,
        );
      },
    );
    await t.test(
      "matched pair can chat; others cannot; call permission is enforced",
      async () => {
        assert.equal(
          (
            await resident.call("/api/request/chat", {
              id: created.body.id,
              text: "你好，請稍候。",
            })
          ).status,
          201,
        );
        const chat = await winner.call(
          "/api/request/chat?id=" + created.body.id,
        );
        assert.equal(chat.body.messages[0].text, "你好，請稍候。");
        assert.equal(
          (await loser.call("/api/request/chat?id=" + created.body.id)).status,
          404,
        );
        assert.equal(
          (
            await other.call("/api/request/chat", {
              id: created.body.id,
              text: "intrusion",
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await resident.call("/api/request/chat", {
              id: created.body.id,
              text: "x".repeat(1001),
            })
          ).status,
          400,
        );
        await resident.call(
          "/api/account",
          {
            name: resident.user.name,
            phone: resident.user.phone,
            privacy: { allowCalls: true, allowChat: true, allowAI: false },
          },
          "PATCH",
        );
        const status = await winner.call(
          "/api/request/status?id=" + created.body.id,
        );
        assert.match(status.body.callPhone, /^\+[1-9]\d{7,14}$/);
        assert.notEqual(status.body.callPhone, resident.user.phone);
        assert.equal(status.body.testCall, true);
        assert.equal(
          (await resident.call("/api/auth")).body.user.phone,
          "+85261234567",
        );
        await resident.call(
          "/api/account",
          {
            name: resident.user.name,
            phone: resident.user.phone,
            privacy: { allowCalls: false, allowChat: false, allowAI: false },
          },
          "PATCH",
        );
        assert.equal(
          (await winner.call("/api/request/status?id=" + created.body.id)).body
            .callPhone,
          null,
        );
        assert.equal(
          (await winner.call("/api/request/chat?id=" + created.body.id)).status,
          403,
        );
        assert.equal(
          (
            await winner.call("/api/request/chat", {
              id: created.body.id,
              text: "blocked",
            })
          ).status,
          403,
        );
      },
    );
    await t.test("closing a request revokes conversation access", async () => {
      assert.equal(
        (await resident.call("/api/request/close", { id: created.body.id }))
          .status,
        200,
      );
      assert.equal(
        (await winner.call("/api/request/chat?id=" + created.body.id)).status,
        403,
      );
      assert.equal(
        (await winner.call("/api/request/status?id=" + created.body.id)).body
          .status,
        "CLOSED",
      );
    });
    await t.test(
      "real image preprocessing and separate audio/image validation",
      async () => {
        const image = await sharp({
          create: {
            width: 1800,
            height: 900,
            channels: 3,
            background: "#228844",
          },
        })
          .jpeg()
          .toBuffer();
        const f = form();
        f.set("image", new Blob([image], { type: "image/jpeg" }), "test.jpg");
        const r = await resident.call("/api/triage", f);
        assert.equal(r.status, 201);
        assert.equal(r.body.imageStatus, "prepared");
        assert.equal(r.body.imageWidth, 1600);
        assert.equal(r.body.imageHeight, 800);
        const fake = form();
        fake.set(
          "image",
          new Blob(["not an image"], { type: "image/jpeg" }),
          "fake.jpg",
        );
        assert.equal((await resident.call("/api/triage", fake)).status, 400);
        const big = form();
        big.set(
          "audio",
          new Blob(["audio"], { type: "audio/webm" }),
          "audio.webm",
        );
        big.set(
          "image",
          new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], {
            type: "image/jpeg",
          }),
          "large.jpg",
        );
        assert.equal((await resident.call("/api/triage", big)).status, 413);
        const missing = form();
        missing.delete("lat");
        assert.equal((await resident.call("/api/triage", missing)).status, 400);
        const audio = form("");
        audio.set(
          "audio",
          new Blob(["audio"], { type: "audio/webm" }),
          "audio.webm",
        );
        const fallback = await resident.call("/api/triage", audio);
        assert.equal(fallback.body.audioStatus, "unavailable");
        assert.equal(fallback.body.transcript, undefined);
      },
    );
    await t.test("cross-origin writes and logout are rejected", async () => {
      const r = await fetch(base + "/api/auth", {
        method: "POST",
        headers: {
          Origin: "https://other.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      assert.equal(r.status, 403);
      await other.call("/api/auth", undefined, "DELETE");
      assert.equal((await other.call("/api/request/status")).status, 401);
    });
  } finally {
    for (const c of clients) await c.call("/api/account", undefined, "DELETE");
  }
});
test("expired and closed chat content is purged from memory", async () => {
  const source = await readFile(
    new URL("../lib/db.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const db = await import(
    "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  );
  const data = db.store();
  data.requests.push(
    {
      id: "expired",
      status: "ACCEPTED",
      chatExpiresAt: new Date(Date.now() - 1000).toISOString(),
    },
    {
      id: "closed",
      status: "CLOSED",
      chatExpiresAt: new Date(Date.now() + 100000).toISOString(),
    },
  );
  data.messages.push(
    { requestId: "expired", text: "private" },
    { requestId: "closed", text: "private" },
  );
  assert.equal(db.store().messages.length, 0);
  delete globalThis.__carecallV2;
});
