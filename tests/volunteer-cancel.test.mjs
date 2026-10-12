import { test } from "node:test";
import assert from "node:assert/strict";

const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47331";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const stamp = String(Date.now()).slice(-7);

async function client(role, phone) {
  const response = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      mode: "create",
      name: "Cancel " + role,
      phone,
      role,
      privacyAccepted: true,
      password: "test-password-1",
    }),
  });
  assert.equal(response.status, 200);
  const { user } = await response.json();
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
  return { user, call };
}

function requestForm() {
  const form = new FormData();
  form.set("text", "Please buy 2 kg of rice tonight.");
  form.set("lat", "22.3");
  form.set("lng", "114.1");
  return form;
}

test("an assigned volunteer can cancel an accepted request without earning points", async () => {
  const resident = await client("resident", "5" + stamp);
  const volunteer = await client("volunteer", "6" + stamp);
  const other = await client("volunteer", "7" + stamp);
  try {
    const profile = await resident.call("/api/auth");
    assert.equal(
      (
        await resident.call(
          "/api/account",
          {
            name: profile.body.user.name,
            phone: "5" + stamp,
            privacy: { ...profile.body.user.privacy, allowAI: false },
          },
          "PATCH",
        )
      ).status,
      200,
    );
    const made = await resident.call("/api/triage", requestForm());
    assert.equal(made.status, 201);
    const id = made.body.id;
    assert.equal((await volunteer.call("/api/volunteer/shift", { available: true }, "PATCH")).status, 200);
    assert.equal((await volunteer.call("/api/volunteer/accept", { id, lat: 22.3, lng: 114.1 })).status, 200);
    assert.equal((await volunteer.call("/api/request/close", { id })).status, 403);
    assert.equal((await volunteer.call("/api/request/status?id=" + id)).body.status, "ACCEPTED");
    assert.equal((await other.call("/api/request/cancel", { id })).status, 404);
    assert.equal((await resident.call("/api/request/cancel", { id })).status, 403);
    const cancelled = await volunteer.call("/api/request/cancel", { id });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, "CLOSED");
    assert.equal(cancelled.body.closedReason, "cancelled");
    assert.equal((await volunteer.call("/api/volunteer/rewards")).body.points, 0);
    assert.equal((await volunteer.call("/api/request/cancel", { id })).body.closedReason, "cancelled");
    assert.equal((await resident.call("/api/request/status?id=" + id)).body.closedReason, "cancelled");

    const again = await resident.call("/api/triage", requestForm());
    assert.equal(again.status, 201);
    assert.equal(
      (await volunteer.call("/api/volunteer/accept", { id: again.body.id, lat: 22.3, lng: 114.1 })).status,
      200,
    );
    assert.equal((await resident.call("/api/request/close", { id: again.body.id })).status, 200);
    assert.equal((await volunteer.call("/api/volunteer/rewards")).body.points, 5);
  } finally {
    await resident.call("/api/account", undefined, "DELETE");
    await volunteer.call("/api/account", undefined, "DELETE");
    await other.call("/api/account", undefined, "DELETE");
  }
});
