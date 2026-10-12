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
      name: "Rate " + role,
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
  return { call };
}

function requestForm() {
  const form = new FormData();
  form.set("text", "Please buy 2 kg of rice tonight.");
  form.set("lat", "22.3");
  form.set("lng", "114.1");
  return form;
}

test("both people can rate a completed request and very low ratings are flagged", async () => {
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
    assert.equal(
      (await volunteer.call("/api/volunteer/shift", { available: true }, "PATCH")).status,
      200,
    );
    async function complete() {
      const made = await resident.call("/api/triage", requestForm());
      assert.equal(made.status, 201);
      const id = made.body.id;
      assert.equal(
        (await volunteer.call("/api/volunteer/accept", { id, lat: 22.3, lng: 114.1 })).status,
        200,
      );
      assert.equal((await resident.call("/api/request/close", { id })).status, 200);
      return id;
    }
    const first = await complete();
    assert.equal((await resident.call("/api/request/rating", { id: first, score: 1 })).status, 200);
    assert.equal((await volunteer.call("/api/request/rating", { id: first, score: 1 })).status, 200);
    assert.equal((await resident.call("/api/request/rating", { id: first, score: 5 })).status, 409);
    assert.equal((await resident.call("/api/request/status?id=" + first)).body.myRating, 1);
    assert.equal(
      (await resident.call("/api/request/status?id=" + first)).body.partnerCredibility.flagged,
      false,
    );
    const cancelled = await resident.call("/api/triage", requestForm());
    assert.equal(
      (await volunteer.call("/api/volunteer/accept", { id: cancelled.body.id, lat: 22.3, lng: 114.1 })).status,
      200,
    );
    assert.equal((await volunteer.call("/api/request/cancel", { id: cancelled.body.id })).status, 200);
    assert.equal((await resident.call("/api/request/rating", { id: cancelled.body.id, score: 1 })).status, 403);

    const second = await complete();
    assert.equal((await resident.call("/api/request/rating", { id: second, score: 1 })).status, 200);
    assert.equal((await volunteer.call("/api/request/rating", { id: second, score: 2 })).status, 200);
    const seen = await resident.call("/api/request/status?id=" + second);
    assert.equal(seen.body.partnerCredibility.flagged, true);
    assert.equal(seen.body.partnerCredibility.average, 1);
    assert.equal(seen.body.partnerCredibility.count, 2);
    const volunteerSeen = await volunteer.call("/api/request/status?id=" + second);
    assert.equal(volunteerSeen.body.partnerCredibility.flagged, true);
    assert.equal(volunteerSeen.body.partnerCredibility.average, 1.5);
    assert.equal((await volunteer.call("/api/volunteer/rewards")).body.points, 10);

    assert.equal(
      (await other.call("/api/volunteer/shift", { available: true }, "PATCH")).status,
      200,
    );
    const open = await resident.call("/api/triage", requestForm());
    const tasks = await other.call(
      "/api/volunteer/tasks?lat=22.3&lng=114.1",
    );
    const listed = tasks.body.tasks.find((task) => task.id === open.body.id);
    assert.equal(listed.residentFlagged, true);
    assert.equal(listed.summary, undefined);
    assert.equal((await other.call("/api/request/rating", { id: second, score: 1 })).status, 404);
  } finally {
    await resident.call("/api/account", undefined, "DELETE");
    await volunteer.call("/api/account", undefined, "DELETE");
    await other.call("/api/account", undefined, "DELETE");
  }
});
