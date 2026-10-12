import { test } from "node:test";
import assert from "node:assert/strict";

const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47291";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const stamp = String(Date.now()).slice(-7);

async function client(role, phone) {
  const response = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      mode: "create",
      name: "Friend " + role,
      phone,
      role,
      privacyAccepted: true,
      password: "test-password-1",
    }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const call = async (path, body, method = body === undefined ? "GET" : "POST") => {
    const res = await fetch(base + path, {
      method,
      headers: {
        Cookie: cookie,
        Origin: base,
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return { call, phone };
}

function requestForm() {
  const form = new FormData();
  form.set("text", "Please buy 2 kg of rice tonight.");
  form.set("lat", "22.3");
  form.set("lng", "114.1");
  return form;
}

test("completed requests become friends only when both accept, then they can chat", async () => {
  const residentPhone = "8" + stamp;
  const volunteerPhone = "9" + stamp;
  const resident = await client("resident", residentPhone);
  const volunteer = await client("volunteer", volunteerPhone);
  const other = await client("volunteer", "4" + stamp);
  try {
    const profile = await resident.call("/api/auth");
    assert.equal(
      (
        await resident.call(
          "/api/account",
          {
            name: profile.body.user.name,
            phone: residentPhone,
            privacy: { ...profile.body.user.privacy, allowAI: false },
          },
          "PATCH",
        )
      ).status,
      200,
    );
    assert.equal(
      (await volunteer.call("/api/volunteer/shift", { available: true }, "PATCH")).status,
      200,
    );
    async function complete() {
      const made = await resident.call("/api/triage", requestForm());
      assert.equal(made.status, 201);
      const id = made.body.id;
      assert.equal((await resident.call("/api/friends", { id, decision: "accept" })).status, 403);
      assert.equal(
        (await volunteer.call("/api/volunteer/accept", { id, lat: 22.3, lng: 114.1 })).status,
        200,
      );
      assert.equal((await resident.call("/api/request/close", { id })).status, 200);
      return id;
    }
    const first = await complete();
    assert.equal((await resident.call("/api/friends", { id: first, decision: "accept" })).body.friendStatus, "outgoing");
    assert.equal((await resident.call("/api/friends", { id: first, decision: "decline" })).status, 409);
    assert.equal((await volunteer.call("/api/request/status?id=" + first)).body.friendStatus, "incoming");
    const waiting = await volunteer.call("/api/friends");
    assert.equal(waiting.body.friends.length, 0);
    assert.equal(waiting.body.invites[0].status, "incoming");
    assert.equal(waiting.body.invites[0].requestId, first);
    assert.equal(JSON.stringify(waiting.body).includes(residentPhone), false);
    assert.equal((await volunteer.call("/api/friends/chat?id=missing")).status, 404);

    const joined = await volunteer.call("/api/friends", { id: first, decision: "accept" });
    assert.equal(joined.body.friendStatus, "friends");
    const list = await resident.call("/api/friends");
    assert.equal(list.body.friends.length, 1);
    assert.equal(list.body.friends[0].name, "Friend volunteer");
    assert.equal(list.body.invites.length, 0);
    assert.equal(JSON.stringify(list.body).includes(volunteerPhone), false);
    const friendshipId = list.body.friends[0].id;
    assert.equal(
      (await resident.call("/api/friends/chat", { id: friendshipId, text: "Hello from the resident " + residentPhone })).status,
      201,
    );
    const seen = await volunteer.call("/api/friends/chat?id=" + friendshipId);
    assert.equal(seen.body.messages.length, 1);
    assert.equal(seen.body.messages[0].text.includes(residentPhone), false);
    assert.match(seen.body.messages[0].text, /Hello from the resident/);
    assert.equal(
      (await volunteer.call("/api/friends/chat", { id: friendshipId, text: "Hello back" })).status,
      201,
    );
    const reply = await resident.call("/api/friends/chat?id=" + friendshipId);
    assert.equal(reply.body.messages[1].text, "Hello back");
    assert.equal((await other.call("/api/friends/chat?id=" + friendshipId)).status, 404);
    assert.equal((await other.call("/api/friends", { id: first, decision: "accept" })).status, 404);

    const cancelled = await resident.call("/api/triage", requestForm());
    assert.equal(
      (await volunteer.call("/api/volunteer/accept", { id: cancelled.body.id, lat: 22.3, lng: 114.1 })).status,
      200,
    );
    assert.equal((await volunteer.call("/api/request/cancel", { id: cancelled.body.id })).status, 200);
    assert.equal((await resident.call("/api/friends", { id: cancelled.body.id, decision: "accept" })).status, 403);

    const second = await complete();
    assert.equal((await resident.call("/api/request/status?id=" + second)).body.friendStatus, "friends");
    assert.equal((await volunteer.call("/api/volunteer/rewards")).body.points, 10);
    assert.equal((await other.call("/api/volunteer/shift", { available: true }, "PATCH")).status, 200);
    const separate = await resident.call("/api/triage", requestForm());
    const third = separate.body.id;
    assert.equal((await other.call("/api/volunteer/accept", { id: third, lat: 22.3, lng: 114.1 })).status, 200);
    assert.equal((await resident.call("/api/request/close", { id: third })).status, 200);
    assert.equal((await other.call("/api/friends", { id: third, decision: "decline" })).body.friendStatus, "declined");
    assert.equal((await resident.call("/api/friends", { id: third, decision: "accept" })).body.friendStatus, "declined");
    assert.equal((await resident.call("/api/friends")).body.friends.length, 1);

    const quiet = await resident.call("/api/auth");
    assert.equal(
      (
        await resident.call(
          "/api/account",
          {
            name: quiet.body.user.name,
            phone: residentPhone,
            privacy: { ...quiet.body.user.privacy, allowChat: false },
          },
          "PATCH",
        )
      ).status,
      200,
    );
    assert.equal((await volunteer.call("/api/friends/chat?id=" + friendshipId)).status, 403);
  } finally {
    await resident.call("/api/account", undefined, "DELETE");
    await volunteer.call("/api/account", undefined, "DELETE");
    await other.call("/api/account", undefined, "DELETE");
  }
});
