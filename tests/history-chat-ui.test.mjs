import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47295";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));

test("history stays in place, chat has room, and volunteer location sharing is opt-in", async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const contexts = [], errors = [];
  async function context(role) {
    const c = await browser.newContext({ viewport: { width: 360, height: 740 } });
    contexts.push(c);
    await c.addInitScript(() => {
      window.watches = new Map(); let id = 0;
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", { value: ok => ok({ coords: { latitude: 22.3193, longitude: 114.1694 } }) });
      Object.defineProperty(navigator.geolocation, "watchPosition", { value: (ok, fail) => { window.watches.set(++id, { ok, fail }); return id; } });
      Object.defineProperty(navigator.geolocation, "clearWatch", { value: id => window.watches.delete(id) });
      window.sendPosition = () => { for (const { ok } of window.watches.values()) ok({ coords: { latitude: 22.32, longitude: 114.17, accuracy: 15 }, timestamp: Date.now() }); };
      window.setVisibility = state => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state }); document.dispatchEvent(new Event("visibilitychange")); };
    });
    const response = await c.request.post(base + "/api/auth", { data: { mode: "create", name: "History " + role, phone: "61234567", role, privacyAccepted: true, password: "test-password-1" } });
    assert.equal(response.status(), 200);
    const p = await c.newPage(); p.on("pageerror", e => errors.push(e.message));
    return { c, p };
  }
  async function screenshot(p, name) {
    if (!process.env.CARECALL_SCREENSHOT_DIR) return;
    mkdirSync(process.env.CARECALL_SCREENSHOT_DIR, { recursive: true });
    await p.screenshot({ path: process.env.CARECALL_SCREENSHOT_DIR + "/" + name + ".png" });
  }
  try {
    const { c: rc, p: resident } = await context("resident"), { c: vc, p: volunteer } = await context("volunteer");
    const request = await (await rc.request.post(base + "/api/triage", { multipart: { text: "History resident needs groceries; call +85261234567.", lat: "22.3193", lng: "114.1694" } })).json();
    await vc.request.patch(base + "/api/volunteer/shift", { data: { available: true } });
    assert.equal((await vc.request.post(base + "/api/volunteer/accept", { data: { id: request.id, lat: 22.3193, lng: 114.1694 } })).status(), 200);
    await rc.request.post(base + "/api/request/chat", { data: { id: request.id, text: "Please meet by the entrance." } });
    await vc.request.post(base + "/api/request/chat", { data: { id: request.id, text: "I am bringing your groceries." } });
    await volunteer.goto(base + "/volunteer");
    await volunteer.getByText("I am bringing your groceries.", { exact: true }).waitFor();
    assert.equal(await volunteer.getByText("A volunteer has accepted", { exact: false }).count(), 0);
    assert.equal(await volunteer.locator(".chat-privacy, .conversation details, .request-workspace > .priority-card").count(), 0);
    assert.equal(await volunteer.evaluate(() => window.watches.size), 0);
    const log = await volunteer.getByRole("log").boundingBox();
    assert(log.height >= 280, `Chat log is only ${log.height}px`);
    await screenshot(volunteer, "volunteer-chat");
    await volunteer.goto(base + "/account/privacy");
    const share = volunteer.getByRole("checkbox", { name: "Share my live location with my matched resident", exact: true });
    await share.waitFor();
    assert.equal(await share.isChecked(), false);
    assert.equal(await volunteer.getByRole("checkbox", { name: "Share my address with my volunteer", exact: true }).count(), 0);
    assert.equal(await volunteer.locator(".privacy-option details").count(), 0);
    await screenshot(volunteer, "volunteer-privacy");
    await share.check();
    await volunteer.getByRole("button", { name: "Save changes", exact: true }).click();
    await volunteer.getByText("Saved", { exact: true }).waitFor();
    await volunteer.getByRole("link", { name: "Back", exact: true }).click();
    await volunteer.waitForFunction(() => window.watches.size === 1);
    const published = volunteer.waitForResponse(r => r.url().endsWith("/api/request/location") && r.request().method() === "PATCH");
    await volunteer.evaluate(() => window.sendPosition());
    assert.equal((await published).status(), 200);
    await resident.goto(base + "/resident");
    await resident.getByRole("tab", { name: "Map", exact: true }).click();
    await resident.getByText("Your volunteer’s recent location", { exact: true }).waitFor();
    await resident.locator('.leaflet-marker-icon[title="Volunteer"]').waitFor();
    await screenshot(resident, "resident-volunteer-map");
    const removed = volunteer.waitForResponse(r => r.url().endsWith("/api/request/location") && r.request().method() === "DELETE");
    await volunteer.evaluate(() => window.setVisibility("hidden"));
    assert.equal((await removed).status(), 200);
    assert.equal(await volunteer.evaluate(() => window.watches.size), 0);
    assert.equal((await (await rc.request.get(base + "/api/request/status?id=" + request.id)).json()).volunteerLocation, undefined);
    await volunteer.evaluate(() => window.setVisibility("visible"));
    await volunteer.waitForFunction(() => window.watches.size === 1);
    await volunteer.goto(base + "/account/privacy");
    await share.uncheck();
    await volunteer.getByRole("button", { name: "Save changes", exact: true }).click();
    await volunteer.getByText("Saved", { exact: true }).waitFor();
    await volunteer.getByRole("link", { name: "Back", exact: true }).click();
    assert.equal(await volunteer.evaluate(() => window.watches.size), 0);
    await resident.getByText("Your volunteer is not sharing their location.", { exact: true }).waitFor();
    assert.equal(await resident.locator('.leaflet-marker-icon[title="Volunteer"]').count(), 0);
    assert.equal((await rc.request.post(base + "/api/request/close", { data: { id: request.id } })).status(), 200);
    for (const p of [resident, volunteer]) {
      await p.getByRole("button", { name: "History", exact: true }).click();
      await p.locator(".history-item").first().click();
      const detail = p.getByRole("region", { name: "Completed request", exact: true });
      await detail.waitFor();
      assert.equal(await p.locator('.bottom-tabs button[aria-current="page"]').innerText(), "◴\nHistory");
      assert(!(await detail.innerText()).includes("61234567"));
      await detail.getByRole("tab", { name: "Conversation", exact: true }).click();
      await detail.getByText("Please meet by the entrance.", { exact: true }).waitFor();
      assert.equal(await detail.locator(".chat-composer, .phone-action").count(), 0);
      await screenshot(p, p === volunteer ? "volunteer-history-chat" : "resident-history-chat");
      await detail.getByRole("button", { name: "Back to history", exact: false }).click();
      await p.locator(".history-item").first().waitFor();
    }
    await resident.goto(base + "/account/privacy");
    assert.equal(await resident.getByRole("checkbox", { name: "Share my address with my volunteer", exact: true }).count(), 1);
    assert.equal(await resident.getByRole("checkbox", { name: "Share my live location with my matched resident", exact: true }).count(), 0);
    assert.equal(await resident.locator(".privacy-option details").count(), 0);
    await resident.getByRole("link", { name: "Privacy notice", exact: true }).click();
    const notice = resident.getByRole("dialog", { name: "Privacy notice", exact: true });
    await notice.getByText("Calls open your device's phone app", { exact: false }).waitFor();
    await notice.getByText("Your matched partner can read messages", { exact: false }).waitFor();
    await resident.keyboard.press("Escape");
    for (const language of ["zh-Hant", "zh-Hans", "en"]) {
      await volunteer.locator("#language").selectOption(language);
      assert.equal(await volunteer.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    }
    assert.deepEqual(errors, []);
  } finally { for (const c of contexts) await c.request.delete(base + "/api/account"); await browser.close(); }
});
