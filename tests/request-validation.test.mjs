import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47291";
assert(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Request tests must stay local",
);
const password = "test-password-1";
const phone = "5" + String(Date.now()).slice(-7);

function form(text = "") {
  const body = new FormData();
  body.set("lat", "22.3193");
  body.set("lng", "114.1694");
  body.set("text", text);
  return body;
}

test("a request needs typed text or a voice transcript", async () => {
  const { effectiveRequestText } = await import("../lib/request-content.ts");
  assert.equal(effectiveRequestText("  ", "  "), "");
  assert.equal(effectiveRequestText(" Need water ", ""), "Need water");
  assert.equal(effectiveRequestText("", " I cannot use the stairs "), "I cannot use the stairs");
  assert.equal(effectiveRequestText("typed", "spoken"), "typed");

  const health = await fetch(base + "/api/health").catch(() => null);
  assert.equal(health?.ok, true, "Start the local CareCall server before this test");
  const created = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      mode: "create",
      name: "Request Check",
      phone,
      role: "resident",
      privacyAccepted: true,
      password,
    }),
  });
  assert.equal(created.status, 200, await created.clone().text());
  const session = created.headers.get("set-cookie").split(";")[0];
  const image = await sharp({
    create: { width: 40, height: 30, channels: 3, background: "#886644" },
  })
    .jpeg()
    .toBuffer();
  async function send(body) {
    const response = await fetch(base + "/api/triage", {
      method: "POST",
      headers: { Cookie: session, Origin: base },
      body,
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    const empty = await send(form(""));
    assert.equal(empty.status, 400);
    assert.equal(empty.body.error, "emptyRequest");

    const imageOnly = form("");
    imageOnly.set("image", new Blob([image], { type: "image/jpeg" }), "photo.jpg");
    const photo = await send(imageOnly);
    assert.equal(photo.status, 400);
    assert.equal(photo.body.error, "emptyRequest");

    const unspoken = form("");
    unspoken.set("audio", new Blob(["audio"], { type: "audio/webm" }), "voice.webm");
    const noTranscript = await send(unspoken);
    assert.equal(noTranscript.status, 400);
    assert.equal(noTranscript.body.error, "emptyRequest");

    const textOnly = await send(form("Please bring water upstairs."));
    assert.equal(textOnly.status, 201);
    assert.equal(textOnly.body.transcript, "Please bring water upstairs.");
    assert.equal(textOnly.body.imageStatus, "none");

    const voice = form("I need help carrying supplies.");
    voice.set("audio", new Blob(["audio"], { type: "audio/webm" }), "voice.webm");
    const voiceOnly = await send(voice);
    assert.equal(voiceOnly.status, 201);
    assert.equal(voiceOnly.body.transcript, "I need help carrying supplies.");
    assert.equal(voiceOnly.body.audioStatus, "provided");
    assert.equal(voiceOnly.body.imageStatus, "none");

    const withPhoto = form("The entrance light is out.");
    withPhoto.set("image", new Blob([image], { type: "image/jpeg" }), "photo.jpg");
    const textImage = await send(withPhoto);
    assert.equal(textImage.status, 201);
    assert.equal(textImage.body.imageStatus, "prepared");
    assert.equal(textImage.body.transcript, "The entrance light is out.");

    const voicePhoto = form("Please bring a flashlight.");
    voicePhoto.set("audio", new Blob(["audio"], { type: "audio/webm" }), "voice.webm");
    voicePhoto.set("image", new Blob([image], { type: "image/jpeg" }), "photo.jpg");
    const voiceImage = await send(voicePhoto);
    assert.equal(voiceImage.status, 201);
    assert.equal(voiceImage.body.audioStatus, "provided");
    assert.equal(voiceImage.body.imageStatus, "prepared");
    assert.equal(voiceImage.body.transcript, "Please bring a flashlight.");
  } finally {
    await fetch(base + "/api/account", {
      method: "DELETE",
      headers: { Cookie: session, Origin: base },
    });
  }
});
