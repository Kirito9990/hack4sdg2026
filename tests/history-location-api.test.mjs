import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { saveSharedLocation, sharedLocation, clearVolunteerLocations } from "../lib/volunteer-location.ts";
const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47295";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));

test("shared volunteer points expire and revocation removes all their points", t => {
  let now = 1800000000000;
  t.mock.method(Date, "now", () => now);
  saveSharedLocation("task1", "helper", { lat: 22.3, lng: 114.1, accuracy: 10, updatedAt: now });
  assert(sharedLocation("task1", "helper"));
  assert.equal(sharedLocation("task1", "stranger"), undefined);
  now += 60000;
  assert.equal(sharedLocation("task1", "helper"), undefined);
  saveSharedLocation("task2", "helper", { lat: 22.3, lng: 114.1, accuracy: 10, updatedAt: now });
  clearVolunteerLocations("helper");
  assert.equal(sharedLocation("task2", "helper"), undefined);
});

test("history redaction and live location enforce roles, consent, membership and completion", async () => {
  const clients = [];
  async function client(role, name, phone = "61234567") {
    const r = await fetch(base + "/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "create", name, phone, role, privacyAccepted: true, password: "test-password-1" }) });
    const { user } = await r.json(), cookie = r.headers.get("set-cookie").split(";")[0];
    const c = { user, async call(path, body, method = body === undefined ? "GET" : "POST", origin = base) {
      const response = await fetch(base + path, { method, headers: { Cookie: cookie, Origin: origin, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    } };
    clients.push(c); return c;
  }
  async function privacy(c, changes) {
    const response = await c.call("/api/account", { name: c.user.name, phone: c.user.phone, address: c.user.role === "resident" ? "Private Estate\nFlat Zebra" : "", privacy: { ...c.user.privacy, ...changes } }, "PATCH");
    assert.equal(response.status, 200); c.user = response.body.user;
  }
  try {
    const resident = await client("resident", "Private Resident"), volunteer = await client("volunteer", "Private Helper"), stranger = await client("volunteer", "Other Helper", "60001005");
    await privacy(resident, { shareAddress: true, showName: true, allowCalls: true, shareLocation: true });
    assert.equal(resident.user.privacy.shareLocation, false);
    await privacy(volunteer, { shareAddress: true });
    assert.equal(volunteer.user.privacy.shareAddress, false);
    const photo = await sharp({ create: { width: 24, height: 24, channels: 3, background: "#eee" } }).png().toBuffer();
    const f = new FormData();
    f.set("text", "Private Resident at Private Estate, Flat Zebra. Phone +85261234567. Bring groceries.");
    f.set("lat", "22.3193"); f.set("lng", "114.1694");
    f.set("image", new Blob([photo], { type: "image/png" }), "photo.png");
    const created = await resident.call("/api/triage", f);
    assert.equal(created.status, 201);
    const id = created.body.id;
    await volunteer.call("/api/volunteer/shift", { available: true }, "PATCH");
    assert.equal((await volunteer.call("/api/volunteer/accept", { id, lat: 22.3193, lng: 114.1694 })).status, 200);
    const point = () => ({ id, lat: 22.31991, lng: 114.16991, accuracy: 18, timestamp: Date.now() });
    assert.equal((await volunteer.call("/api/request/location", point(), "PATCH")).status, 403);
    await privacy(volunteer, { shareLocation: true, allowLocation: true });
    assert.equal((await resident.call("/api/request/location", point(), "PATCH")).status, 404);
    assert.equal((await stranger.call("/api/request/location", point(), "PATCH")).status, 404);
    assert.equal((await volunteer.call("/api/request/location", { ...point(), lat: 100 }, "PATCH")).status, 400);
    assert.equal((await volunteer.call("/api/request/location", { ...point(), timestamp: Date.now() - 40000 }, "PATCH")).status, 400);
    assert.equal((await volunteer.call("/api/request/location", point(), "PATCH", "https://other.example")).status, 403);
    assert.equal((await volunteer.call("/api/request/location", point(), "PATCH")).status, 200);
    assert.equal((await resident.call("/api/request/status?id=" + id)).body.volunteerLocation.lat, 22.31991);
    assert.equal((await volunteer.call("/api/request/status?id=" + id)).body.volunteerLocation, undefined);
    assert.equal((await stranger.call("/api/request/status?id=" + id)).status, 404);
    await privacy(volunteer, { shareLocation: false });
    assert.equal((await resident.call("/api/request/status?id=" + id)).body.volunteerLocation, undefined);
    await privacy(volunteer, { shareLocation: true });
    assert.equal((await resident.call("/api/request/status?id=" + id)).body.volunteerLocation, undefined);
    await volunteer.call("/api/request/location", point(), "PATCH");
    await volunteer.call("/api/request/location", { id }, "DELETE");
    assert.equal((await resident.call("/api/request/status?id=" + id)).body.volunteerLocation, undefined);
    await volunteer.call("/api/request/location", point(), "PATCH");
    assert.equal((await volunteer.call("/api/account/location", { allowed: false }, "PATCH")).body.user.privacy.shareLocation, false);
    assert.equal((await resident.call("/api/request/status?id=" + id)).body.volunteerLocation, undefined);
    await privacy(volunteer, { shareLocation: true, allowLocation: true });
    await volunteer.call("/api/request/location", point(), "PATCH");
    const chat = new FormData(); chat.set("id", id); chat.set("text", "Private Helper: +85261234567, Private Estate, Flat Zebra. On my way."); chat.set("image", new Blob([photo], { type: "image/png" }), "chat.png");
    assert.equal((await volunteer.call("/api/request/chat", chat)).status, 201);
    assert.equal((await resident.call("/api/request/chat?id=" + id)).body.messages[0].imageData.startsWith("data:"), true);
    await resident.call("/api/request/close", { id });
    for (const c of [resident, volunteer]) {
      const history = (await c.call("/api/request/status?id=" + id)).body;
      for (const key of ["lat", "lng", "residentAddress", "imageData", "volunteerLocation"]) assert.equal(history[key], undefined, key);
      assert.equal(history.callPhone, null); assert.equal(history.residentName, ""); assert.equal(history.volunteerName, "");
      assert.equal(history.imageHidden, true);
      const messages = (await c.call("/api/request/chat?id=" + id)).body.messages;
      assert.equal(messages[0].imageData, undefined); assert.equal(messages[0].imageHidden, true);
      const visible = JSON.stringify({ history, messages });
      for (const secret of ["Private Resident", "Private Helper", "Private Estate", "Flat Zebra", "61234567", "22.31991"]) assert(!visible.includes(secret), secret);
    }
    assert.equal((await volunteer.call("/api/request/location", point(), "PATCH")).status, 403);
    assert.equal((await volunteer.call("/api/request/chat", { id, text: "late" })).status, 403);
    await privacy(volunteer, { allowChat: false });
    assert.equal((await resident.call("/api/request/chat?id=" + id)).status, 403);
  } finally { for (const c of clients) await c.call("/api/account", undefined, "DELETE"); }
});
