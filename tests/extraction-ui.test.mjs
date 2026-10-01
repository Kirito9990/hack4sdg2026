import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import sharp from "sharp";
import { translate } from "../lib/i18n.ts";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47297";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));

test("photo needs text or voice; attachment remains viewable by the matched volunteer", async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  const contexts = [], errors = [];
  async function client(role) {
    const context = await browser.newContext({ viewport: { width: 360, height: 740 }, permissions: ["microphone"] });
    contexts.push(context);
    await context.addInitScript(() => {
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", { value: (ok) => ok({ coords: { latitude: 22.3, longitude: 114.1 } }) });
    });
    const response = await context.request.post(base + "/api/auth", {
      data: { name: "Attachment " + role, phone: "61234567", role, privacyAccepted: true },
    });
    assert.equal(response.status(), 200);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    return { context, page };
  }
  try {
    const { context: resident, page } = await client("resident");
    const { context: volunteer, page: helper } = await client("volunteer");
    const { context: outsider } = await client("resident");
    const image = await sharp({ create: { width: 100, height: 70, channels: 3, background: "green" } }).png().toBuffer();
    let submissions = 0;
    page.on("request", (request) => { if (request.url().endsWith("/api/triage") && request.method() === "POST") submissions++; });
    await page.goto(base + "/resident");
    await page.locator('input[type="file"]').setInputFiles({ name: "attachment.png", mimeType: "image/png", buffer: image });
    for (const locale of ["en", "zh-Hant", "zh-Hans"]) {
      const t = (key) => translate(locale, key);
      await page.locator("#language").selectOption(locale);
      await page.getByRole("textbox", { name: t("description"), exact: true }).fill("  ");
      await page.getByRole("button", { name: t("sendRequest"), exact: true }).click();
      await page.getByRole("alert").getByText(t("emptyRequest"), { exact: true }).waitFor();
      assert.equal(submissions, 0);
      assert.equal(await page.getByRole("img", { name: t("photoPreview"), exact: true }).count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    }
    await page.locator("#language").selectOption("en");
    await page.getByRole("textbox", { name: translate("en", "description"), exact: true }).fill("Please help carry supplies.");
    await page.getByRole("button", { name: translate("en", "sendRequest"), exact: true }).click();
    await page.locator(".pending-card").waitFor();
    assert.equal(submissions, 1);
    const records = await (await resident.request.get(base + "/api/request/status")).json();
    const saved = records.requests[0];
    assert(saved.imageData.startsWith("data:image/jpeg;base64,"));
    assert.equal(saved.imageStatus, "prepared");
    assert.equal(saved.imageText, undefined);
    assert.equal(saved.imageDescription, undefined);
    assert.equal((await outsider.request.get(base + "/api/request/status?id=" + saved.id)).status(), 404);
    await volunteer.request.patch(base + "/api/volunteer/shift", { data: { available: true } });
    const accepted = await volunteer.request.post(base + "/api/volunteer/accept", { data: { id: saved.id, lat: 22.3, lng: 114.1 } });
    assert.equal(accepted.status(), 200);
    const matched = await (await volunteer.request.get(base + "/api/request/status?id=" + saved.id)).json();
    assert.equal(matched.imageData, saved.imageData);
    await helper.goto(base + "/volunteer");
    const visiblePhoto = helper.getByRole("img", { name: translate("en", "requestPhoto"), exact: true });
    await visiblePhoto.waitFor();
    assert.equal(await visiblePhoto.evaluate((img) => img.complete && img.naturalWidth > 0), true);

    // The alternative to text is a real browser MediaRecorder capture using fake audio.
    await page.getByRole("button", { name: translate("en", "newHelp"), exact: true }).click();
    await page.getByRole("button", { name: translate("en", "tapSpeak"), exact: true }).click();
    await page.getByRole("button", { name: translate("en", "tapStop"), exact: true }).waitFor();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: translate("en", "tapStop"), exact: true }).click();
    await page.locator("audio").waitFor();
    assert.equal(await page.getByRole("textbox", { name: translate("en", "description"), exact: true }).inputValue(), "");
    await page.getByRole("button", { name: translate("en", "sendRequest"), exact: true }).click();
    await page.locator(".pending-card").waitFor();
    assert.equal(submissions, 2);
    assert.deepEqual(errors, []);
  } finally {
    for (const context of contexts) await context.request.delete(base + "/api/account");
    await browser.close();
  }
});
