import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47295";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));

test("inline progress, one-time acceptance notices, compact chat and reduced motion", async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const contexts = [], errors = [];
  async function create(role) {
    const c = await browser.newContext({ viewport: { width: 360, height: 740 } });
    contexts.push(c);
    await c.addInitScript(() => {
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", { value: ok => ok({ coords: { latitude: 22.3193, longitude: 114.1694 } }) });
    });
    assert.equal((await c.request.post(base + "/api/auth", { data: { mode: "create", name: "Progress " + role, phone: "61234567", role, privacyAccepted: true, password: "test-password-1" } })).status(), 200);
    const p = await c.newPage();
    p.on("pageerror", e => errors.push(e.message));
    return { c, p };
  }
  async function screenshot(p, name) {
    if (!process.env.CARECALL_SCREENSHOT_DIR) return;
    mkdirSync(process.env.CARECALL_SCREENSHOT_DIR, { recursive: true });
    await p.screenshot({ path: process.env.CARECALL_SCREENSHOT_DIR + "/" + name + ".png" });
  }
  try {
    const { c: rc, p: r } = await create("resident"), { c: vc, p: v } = await create("volunteer");
    const request = await (await rc.request.post(base + "/api/triage", { multipart: { text: "Please bring some groceries to the entrance.", lat: "22.3193", lng: "114.1694" } })).json();
    await r.goto(base + "/resident");
    await r.getByRole("heading", { name: "Request sent successfully", exact: true }).waitFor();
    await vc.request.patch(base + "/api/volunteer/shift", { data: { available: true } });
    await v.goto(base + "/volunteer");
    await v.getByRole("button", { name: "Use my location", exact: true }).click();
    await v.getByRole("button", { name: "Accept request", exact: true }).click();
    await v.locator(".acceptance-notice").getByText("You accepted this request", { exact: true }).waitFor();
    await r.locator(".acceptance-notice").getByText("A volunteer has accepted", { exact: true }).waitFor();
    await screenshot(v, "acceptance-toast");
    for (const p of [r, v]) {
      assert.deepEqual(await p.getByRole("tab").allTextContents(), ["Conversation", "Progress", "Map"]);
      assert.equal(await p.locator(".request-workspace > .status-banner").count(), 0);
      await p.getByRole("button", { name: "View request progress", exact: true }).waitFor();
    }
    await v.locator(".acceptance-notice").waitFor({ state: "hidden", timeout: 8000 });
    await r.locator(".acceptance-notice").waitFor({ state: "hidden", timeout: 8000 });
    const log = await v.getByRole("log").boundingBox();
    assert(log.height >= 280, `Chat log ${log.height}px`);
    await rc.request.post(base + "/api/request/chat", { data: { id: request.id, text: "Please meet by the entrance." } });
    await v.getByText("Please meet by the entrance.", { exact: true }).waitFor();
    await screenshot(v, "volunteer-conversation");
    await v.getByRole("button", { name: "View request progress", exact: true }).click();
    await v.getByRole("heading", { name: "Help in progress", exact: true }).waitFor();
    assert.equal(await v.getByRole("tab", { name: "Progress", exact: true }).getAttribute("aria-selected"), "true");
    assert.equal(await v.locator(".journey-timeline time").count(), 2);
    assert.equal(await v.locator('.journey-timeline [aria-current="step"]').innerText(), "✓\nConnected\n" + await v.locator('.journey-timeline [aria-current="step"] time').innerText());
    assert.equal(await v.locator(".progress-link, .request-details details").count(), 0);
    await screenshot(v, "volunteer-progress-en");
    assert.equal(await v.locator(".journey-connection .activity-connection > span").evaluate(el => getComputedStyle(el, "::after").animationName), "assistance-flow");
    await v.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await v.locator(".journey-connection .activity-connection > span").evaluate(el => getComputedStyle(el, "::after").animationName), "none");
    for (const language of ["zh-Hant", "zh-Hans", "en"]) {
      await v.locator("#language").selectOption(language);
      assert.equal(await v.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await screenshot(v, "volunteer-progress-" + language);
    }
    // Switching tabs and a full reload must not replay the acceptance notice.
    await v.getByRole("button", { name: "History", exact: true }).click();
    await v.getByRole("button", { name: "Requests", exact: true }).click();
    await v.reload();
    await v.getByRole("tab", { name: "Conversation", exact: true }).waitFor();
    assert.equal(await v.locator(".acceptance-notice").count(), 0);
    await v.getByRole("tab", { name: "Map", exact: true }).click();
    await v.getByRole("button", { name: "View request progress", exact: true }).waitFor();
    // Completed records use the actual final status, never the ongoing animation.
    await rc.request.post(base + "/api/request/close", { data: { id: request.id } });
    await v.locator('.bottom-tabs button').filter({hasText:"Requests"}).waitFor({state:"hidden"});
    await v.getByRole("button",{name:"History",exact:true}).click();
    assert.equal(await v.locator(".bottom-tabs button").count(),2);
    await v.locator(".history-item").first().click();
    await v.getByRole("region",{name:"Completed request",exact:true}).waitFor();
    assert.equal(await v.locator(".activity-connection").count(),0);
    assert.equal(await v.locator(".history-summary dd").count(),2);
    assert.deepEqual(errors, []);
  } finally {
    for (const c of contexts) await c.request.delete(base + "/api/account");
    await browser.close();
  }
});
