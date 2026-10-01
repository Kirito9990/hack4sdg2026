import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47293";
assert(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Tests must target a local server",
);
const clients = [];
async function client(role, name, phone = "61234567") {
  const response = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "create",
      name,
      phone,
      role,
      privacyAccepted: true,
      password: "test-password-1",
    }),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  const { user } = await response.json();
  assert.equal(user.passwordHash, undefined);
  assert.equal(JSON.stringify(user).includes("test-password-1"), false);
  const cookie = response.headers.get("set-cookie").split(";")[0];
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
  const result = { user, call, phone, role };
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
      other = await client("resident", "Other Resident", "60001002"),
      a = await client("volunteer", "Volunteer A", "60001003"),
      b = await client("volunteer", "Volunteer B", "60001004");
    assert.equal(
      (await a.call("/api/volunteer/tasks?lat=22.3193&lng=114.1694")).body.tasks
        .length,
      0,
    );
    assert.equal(
      (
        await resident.call(
          "/api/volunteer/shift",
          { available: true },
          "PATCH",
        )
      ).status,
      403,
    );
    for (const c of [a, b])
      assert.equal(
        (await c.call("/api/volunteer/shift", { available: true }, "PATCH"))
          .status,
        200,
      );
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
        assert.equal(task.id, created.body.id);
        assert.equal(task.category, created.body.category);
        assert.equal(task.urgency_level, created.body.urgency_level);
        assert.equal(typeof task.distanceMeters, "number");
        assert.deepEqual(task.requirements, created.body.requirements || []);
        assert.deepEqual(task.tools, created.body.tools || []);
        assert.deepEqual(task.resources, created.body.resources || []);
        assert.equal(task.lat, 22.32);
        assert.equal(task.lng, 114.17);
        assert.deepEqual(Object.keys(task).sort(), [
          "category",
          "createdAt",
          "distanceMeters",
          "id",
          "lat",
          "lng",
          "requirements",
          "resources",
          "source",
          "tools",
          "urgency_level",
        ]);
        for (const key of [
          "residentName",
          "residentPhone",
          "residentId",
          "residentAddress",
          "transcript",
          "summary",
          "imageData",
        ])
          assert(!(key in task));
        const published = JSON.stringify(task);
        assert.equal(published.includes("61234567"), false);
        assert.equal(published.includes("Spoof"), false);
        assert.equal(published.includes("Resident Test"), false);
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
    await t.test("off-shift volunteers cannot accept requests", async () => {
      await a.call("/api/volunteer/shift", { available: false }, "PATCH");
      assert.equal(
        (
          await a.call("/api/volunteer/accept", {
            id: created.body.id,
            lat: 22.3193,
            lng: 114.1694,
          })
        ).status,
        403,
      );
      assert.equal((await a.call("/api/auth")).body.user.available, false);
      await a.call("/api/volunteer/shift", { available: true }, "PATCH");
    });
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
        assert.equal(typeof status.body.summary, "string");
        assert.ok(status.body.summary.length > 0);
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
    await t.test(
      "photos are decoded, private, and available to the matched partner",
      async () => {
        await resident.call(
          "/api/account",
          {
            name: resident.user.name,
            phone: resident.user.phone,
            privacy: { allowCalls: false, allowChat: true, allowAI: false },
          },
          "PATCH",
        );
        const data = await sharp({
          create: {
            width: 1200,
            height: 800,
            channels: 3,
            background: "#227755",
          },
        })
          .jpeg()
          .toBuffer();
        const f = new FormData();
        f.set("id", created.body.id);
        f.set("image", new Blob([data], { type: "image/jpeg" }), "photo.jpg");
        assert.equal((await loser.call("/api/request/chat", f)).status, 404);
        const sent = await resident.call("/api/request/chat", f);
        assert.equal(sent.status, 201);
        assert(
          sent.body.message.imageData.startsWith("data:image/jpeg;base64,"),
        );
        const meta = await sharp(
          Buffer.from(sent.body.message.imageData.split(",")[1], "base64"),
        ).metadata();
        assert(meta.width <= 960);
        assert.equal(meta.exif, undefined);
        const received = await winner.call(
          "/api/request/chat?id=" + created.body.id,
        );
        assert(received.body.messages.some((m) => m.imageData));
        f.set("image", new Blob(["fake"], { type: "image/jpeg" }), "bad.jpg");
        assert.equal((await resident.call("/api/request/chat", f)).status, 400);
        assert.equal((await winner.call("/api/volunteer/shift",{available:false},"PATCH")).status,409);
        assert.equal(
          (
            await winner.call("/api/request/chat", {
              id: created.body.id,
              text: "Still helping off shift",
            })
          ).status,
          201,
        );
      },
    );
    await t.test("completion makes conversation read-only", async () => {
      assert.equal(
        (await winner.call("/api/request/close", { id: created.body.id }))
          .status,
        403,
      );
      assert.equal(
        (await resident.call("/api/request/close", { id: created.body.id }))
          .status,
        200,
      );
      assert.equal(
        (await winner.call("/api/request/chat?id=" + created.body.id)).status,
        200,
      );
      assert.equal(
        (await winner.call("/api/request/status?id=" + created.body.id)).body
          .status,
        "CLOSED",
      );
    });
    const closed = await winner.call(
      "/api/request/status?id=" + created.body.id,
    );
    assert.equal(closed.body.closedReason, "completed");
    assert(closed.body.closedAt);
    assert.equal(closed.body.chatReadable,true);assert.equal(closed.body.chatAvailable,false);assert.equal((await winner.call("/api/request/chat",{id:created.body.id,text:"too late"})).status,403);assert.equal((await winner.call("/api/volunteer/shift",{available:false},"PATCH")).status,200);
    assert.equal(closed.body.imageData, undefined);
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
        assert(r.body.imageData.startsWith("data:image/jpeg;base64,"));
        assert.equal(
          (await other.call("/api/request/status?id=" + r.body.id)).status,
          404,
        );
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
        assert.equal(fallback.status, 400);
        assert.equal(fallback.body.error, "emptyRequest");
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
    for (const c of clients) {
      const deleted = await c.call("/api/account", undefined, "DELETE");
      if (deleted.status === 401) {
        const login = await fetch(base + "/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: base },
          body: JSON.stringify({
            mode: "login",
            phone: c.phone,
            role: c.role,
            password: "test-password-1",
          }),
        });
        const cookie = login.headers.get("set-cookie")?.split(";")[0];
        if (cookie)
          await fetch(base + "/api/account", {
            method: "DELETE",
            headers: { Cookie: cookie, Origin: base },
          });
      }
    }
  }
});
