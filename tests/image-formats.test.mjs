import { register } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

register("./alias-loader.mjs", import.meta.url);
const { chatImage } = await import("../lib/chat-image.ts");
const { isHeifContainer, rasterizeUpload } = await import("../lib/heif-image.ts");
const { isAcceptedImage } = await import("../lib/image-accept.ts");

const fixture = (name) =>
  readFileSync(fileURLToPath(new URL("./fixtures/" + name, import.meta.url)));

function file(bytes, name, type = "") {
  return new File([bytes], name, { type });
}

async function decoded(dataUrl) {
  assert.match(dataUrl, /^data:image\/jpeg;base64,/);
  return sharp(Buffer.from(dataUrl.split(",")[1], "base64")).metadata();
}

function box(type, payload) {
  const out = Buffer.alloc(8 + payload.length);
  out.writeUInt32BE(out.length, 0);
  out.write(type, 4, 4, "latin1");
  payload.copy(out, 8);
  return out;
}

test("the picker accepts mobile photo types and extensions", () => {
  assert.equal(isAcceptedImage({ type: "image/jpeg", name: "a.jpg" }), true);
  assert.equal(isAcceptedImage({ type: "image/png", name: "a.png" }), true);
  assert.equal(isAcceptedImage({ type: "image/webp", name: "a.webp" }), true);
  assert.equal(isAcceptedImage({ type: "image/heic", name: "IMG.HEIC" }), true);
  assert.equal(isAcceptedImage({ type: "image/heif", name: "IMG.HEIF" }), true);
  assert.equal(isAcceptedImage({ type: "", name: "IMG_0001.HEIC" }), true);
  assert.equal(
    isAcceptedImage({ type: "application/octet-stream", name: "photo.heif" }),
    true,
  );
  assert.equal(isAcceptedImage({ type: "image/gif", name: "a.gif" }), false);
  assert.equal(isAcceptedImage({ type: "", name: "notes.txt" }), false);
});

test("jpeg, png, and webp stay on the existing encode path", async () => {
  const jpeg = await sharp({
    create: { width: 40, height: 20, channels: 3, background: "#886644" },
  })
    .jpeg()
    .toBuffer();
  assert.equal(isHeifContainer(jpeg), false);
  assert.equal(await rasterizeUpload(jpeg), jpeg);
  for (const format of ["jpeg", "png", "webp"]) {
    const input = await sharp({
      create: { width: 100, height: 50, channels: 3, background: "#228844" },
    })
      [format]()
      .toBuffer();
    const meta = await decoded(
      await chatImage(file(input, "photo." + format, "image/" + format)),
    );
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 100);
    assert.equal(meta.height, 50);
    assert.equal(meta.exif, undefined);
  }
  const turned = await sharp({
    create: { width: 40, height: 20, channels: 3, background: "#cc2222" },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const upright = await decoded(
    await chatImage(file(turned, "turned.jpg", "image/jpeg")),
  );
  assert.equal(upright.width, 20);
  assert.equal(upright.height, 40);
});

test("heic and heif become a displayable jpeg", async () => {
  for (const [name, type] of [
    ["sample.heic", "image/heic"],
    ["sample.heif", "image/heif"],
  ]) {
    const raw = fixture(name);
    assert.equal(isHeifContainer(raw), true);
    const meta = await decoded(await chatImage(file(raw, name, type)));
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 32);
    assert.equal(meta.height, 24);
  }
  const oriented = await decoded(
    await chatImage(
      file(fixture("oriented.heic"), "IMG.HEIC", "application/octet-stream"),
    ),
  );
  assert.equal(oriented.width, 24);
  assert.equal(oriented.height, 32);
  const pixels = await sharp(
    Buffer.from(
      (
        await chatImage(file(fixture("oriented.heic"), "IMG.HEIC", ""))
      ).split(",")[1],
      "base64",
    ),
  )
    .raw()
    .toBuffer();
  assert.ok(pixels[0] > 150 && pixels[2] < 80);
});

test("oversized and unsupported images are still rejected", async () => {
  const ispe = Buffer.alloc(12);
  ispe.writeUInt32BE(20000, 4);
  ispe.writeUInt32BE(2000, 8);
  const huge = Buffer.concat([
    box(
      "ftyp",
      Buffer.concat([
        Buffer.from("heic"),
        Buffer.alloc(4),
        Buffer.from("mif1heic"),
      ]),
    ),
    box("meta", Buffer.concat([Buffer.alloc(4), box("iprp", box("ipco", box("ispe", ispe)))])),
  ]);
  await assert.rejects(chatImage(file(huge, "huge.heic", "image/heic")), {
    message: "invalidImage",
  });
  const avif = box(
    "ftyp",
    Buffer.concat([Buffer.from("avif"), Buffer.alloc(4), Buffer.from("avif")]),
  );
  assert.equal(isHeifContainer(avif), false);
  await assert.rejects(chatImage(file(avif, "pic.avif", "image/avif")), {
    message: "invalidImage",
  });
  await assert.rejects(
    chatImage(file(Buffer.alloc(8 * 1024 * 1024 + 1), "big.jpg", "image/jpeg")),
    { message: "fileTooLarge" },
  );
});

const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47291";
const password = "test-password-1";

test("a heic attachment is stored for the matched volunteer only", async () => {
  assert.ok(
    ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
    "Request tests must stay local",
  );
  const health = await fetch(base + "/api/health").catch(() => null);
  assert.equal(health?.ok, true, "Start the local CareCall server before this test");
  const stamp = String(Date.now()).slice(-7);
  const heic = fixture("sample.heic");
  async function account(role, suffix) {
    const created = await fetch(base + "/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({
        mode: "create",
        name: role + " " + suffix,
        phone: suffix + stamp,
        role,
        privacyAccepted: true,
        password,
      }),
    });
    assert.equal(created.status, 200, await created.clone().text());
    return created.headers.get("set-cookie").split(";")[0];
  }
  async function send(cookie, body) {
    const response = await fetch(base + "/api/triage", {
      method: "POST",
      headers: { Cookie: cookie, Origin: base },
      body,
    });
    return { status: response.status, body: await response.json() };
  }
  function form(text) {
    const body = new FormData();
    body.set("lat", "22.3193");
    body.set("lng", "114.1694");
    body.set("text", text);
    return body;
  }
  const resident = await account("resident", "6");
  const volunteer = await account("volunteer", "7");
  try {
    const imageOnly = form("");
    imageOnly.set("image", new Blob([heic], { type: "image/heic" }), "IMG.HEIC");
    const rejected = await send(resident, imageOnly);
    assert.equal(rejected.status, 400);
    assert.equal(rejected.body.error, "emptyRequest");

    const withText = form("Please help carry two boxes upstairs.");
    withText.set("image", new Blob([heic], { type: "image/heic" }), "IMG.HEIC");
    const textImage = await send(resident, withText);
    assert.equal(textImage.status, 201, JSON.stringify(textImage.body));
    assert.equal(textImage.body.imageStatus, "prepared");
    assert.equal(textImage.body.transcript, "Please help carry two boxes upstairs.");
    const stored = await decoded(textImage.body.imageData);
    assert.equal(stored.format, "jpeg");
    assert.equal(stored.width, 32);
    assert.equal(stored.height, 24);

    const withVoice = form("Please bring a flashlight upstairs.");
    withVoice.set("audio", new Blob(["audio"], { type: "audio/webm" }), "voice.webm");
    withVoice.set("keepAudio", "1");
    withVoice.set("image", new Blob([heic], { type: "image/heif" }), "photo.heif");
    const voiceImage = await send(resident, withVoice);
    assert.equal(voiceImage.status, 201, JSON.stringify(voiceImage.body));
    assert.equal(voiceImage.body.audioStatus, "provided");
    assert.equal(voiceImage.body.imageStatus, "prepared");
    assert.match(voiceImage.body.imageData, /^data:image\/jpeg;base64,/);

    const shift = await fetch(base + "/api/volunteer/shift", {
      method: "PATCH",
      headers: {
        Cookie: volunteer,
        Origin: base,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ available: true }),
    });
    assert.equal(shift.status, 200);
    const tasks = await fetch(
      base + "/api/volunteer/tasks?lat=22.3193&lng=114.1694",
      { headers: { Cookie: volunteer, Origin: base } },
    );
    const taskBody = await tasks.json();
    assert.equal(tasks.status, 200);
    assert.equal(
      taskBody.tasks.some((task) => task.id === textImage.body.id),
      true,
    );
    assert.equal(JSON.stringify(taskBody).includes("imageData"), false);
    assert.equal(JSON.stringify(taskBody).includes(textImage.body.transcript), false);

    const accepted = await fetch(base + "/api/volunteer/accept", {
      method: "POST",
      headers: {
        Cookie: volunteer,
        Origin: base,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: textImage.body.id,
        lat: 22.3193,
        lng: 114.1694,
      }),
    });
    const acceptedBody = await accepted.json();
    assert.equal(accepted.status, 200, JSON.stringify(acceptedBody));
    const viewed = await decoded(acceptedBody.imageData);
    assert.equal(viewed.format, "jpeg");
    assert.equal(viewed.width, 32);
    assert.equal(viewed.height, 24);
  } finally {
    for (const cookie of [resident, volunteer]) {
      if (!cookie) continue;
      await fetch(base + "/api/account", {
        method: "DELETE",
        headers: { Cookie: cookie, Origin: base },
      });
    }
  }
});
