import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47295";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));

test("accepted task navigation: mobile links, live GPS, fallbacks, lifecycle and completion", async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const errors = [], contexts = [];
  async function context(role) {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 Version/18.4 Mobile/15E148 Safari/604.1" });
    contexts.push(c);
    await c.addInitScript(() => {
      let next = 1;
      window.watches = new Map();
      window.watchStarts = 0;
      window.watchStops = 0;
      Object.defineProperty(navigator.geolocation, "watchPosition", { value: (ok, fail, options) => {
        const id = next++; window.watchStarts++; window.lastGeoOptions = options;
        window.watches.set(id, { ok, fail }); return id;
      } });
      Object.defineProperty(navigator.geolocation, "clearWatch", { value: id => { window.watchStops++; window.watches.delete(id); } });
      window.sendPosition = (lat = 22.319, lng = 114.169, accuracy = 12, age = 0) => {
        for (const { ok } of window.watches.values()) ok({ coords: { latitude: lat, longitude: lng, accuracy }, timestamp: Date.now() - age });
      };
      window.sendGeoError = code => { for (const { fail } of [...window.watches.values()]) fail({ code }); };
      window.setVisibility = state => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
        document.dispatchEvent(new Event("visibilitychange"));
      };
    });
    const response = await c.request.post(base + "/api/auth", { data: { name: "Navigation " + role, phone: "61234567", role, privacyAccepted: true } });
    assert.equal(response.status(), 200);
    return c;
  }
  try {
    const resident = await context("resident"), volunteer = await context("volunteer");
    const created = await resident.request.post(base + "/api/triage", { multipart: { lat: "22.3193", lng: "114.1694", text: "Please bring supplies to the entrance." } });
    assert.equal(created.status(), 201);
    const request = await created.json();
    assert.equal((await volunteer.request.patch(base + "/api/volunteer/shift", { data: { available: true } })).status(), 200);
    assert.equal((await volunteer.request.post(base + "/api/volunteer/accept", { data: { id: request.id, lat: 22.319, lng: 114.169 } })).status(), 200);
    const p = await volunteer.newPage();
    p.on("pageerror", e => errors.push(e.message));
    p.on("console", msg => { if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) errors.push(msg.text()); });
    const routingRequests = [];
    p.on("request", r => { if (r.url().includes("/api/request/route")) routingRequests.push(r.url()); });
    await p.goto(base + "/volunteer");
    await p.getByRole("tab", { name: "Map", exact: true }).click();
    const panel = p.getByRole("region", { name: "Get directions", exact: true });
    await panel.waitFor();
    assert.equal(await p.evaluate(() => window.watchStarts), 0);
    assert.equal(await panel.getByRole("radio").count(), 0);
    assert.equal(await panel.locator("select").count(), 0);
    await panel.locator(".leaflet-container").waitFor();
    const start = p.getByRole("button", { name: "Start navigation", exact: true });
    const sheet = p.getByRole("dialog", { name: "Choose a map app", exact: true });
    await start.click();
    await sheet.waitFor();
    assert.equal(await sheet.locator(".map-app-row").count(), 4);
    assert.equal(new URL(await sheet.getByRole("link", { name: "AMap", exact: true }).getAttribute("href")).protocol, "iosamap:");
    assert.equal(new URL(await sheet.getByRole("link", { name: "Baidu Maps", exact: true }).getAttribute("href")).searchParams.get("coord_type"), "wgs84");
    assert.equal(await sheet.getByRole("link").count(), 4); // One action per app; no Open/Install choice.
    assert.notEqual(await sheet.evaluate(el => getComputedStyle(el).animationName), "none");
    await sheet.getByRole("link", { name: "Google Maps", exact: true }).focus();
    for (let i = 0; i < 12; i++) {
      await p.keyboard.press("Tab");
      assert(await sheet.evaluate(el => el.contains(document.activeElement)));
    }
    await p.keyboard.press("Escape");
    await sheet.waitFor({ state: "hidden" });
    assert(await start.evaluate(el => el === document.activeElement));
    await start.click();
    await p.mouse.click(5, 5);
    await sheet.waitFor({ state: "hidden" });
    // Inspect Android intents without launching external apps or stores.
    await p.evaluate(() => Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 Android" }));
    await start.click();
    assert.equal(await sheet.locator(".map-app-row").count(), 3);
    const androidLink = await sheet.getByRole("link", { name: "AMap", exact: true }).getAttribute("href");
    assert(androidLink.startsWith("intent://"));
    assert(androidLink.includes("S.browser_fallback_url=https%3A%2F%2Fsj.qq.com%2Fappdetail%2Fcom.autonavi.minimap"));
    assert.equal(await sheet.getByRole("link").count(), 3);
    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    await p.emulateMedia({ reducedMotion: "reduce" });
    await start.click();
    assert.equal(await sheet.evaluate(el => getComputedStyle(el).animationName), "none");
    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
    await p.emulateMedia({ reducedMotion: "no-preference" });
    await p.evaluate(() => Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 iPhone" }));
    await p.clock.install();
    // React handles the click first; block only the browser's native launch.
    // Store navigation is intercepted locally, never sent to a real store.
    await p.evaluate(() => document.addEventListener("click", e => {
      if (e.target.closest(".map-app-launch")) e.preventDefault();
    }));
    const stores = [];
    await p.route("https://apps.apple.com/**", route => {
      stores.push(route.request().url());
      return route.fulfill({ contentType: "text/html", body: "<title>Intercepted store</title>" });
    });
    await start.click();
    await sheet.getByRole("link", { name: "AMap", exact: true }).click();
    await p.keyboard.press("Escape");
    await p.clock.runFor(3000);
    assert.deepEqual(stores, []);
    await start.click();
    await sheet.getByRole("link", { name: "AMap", exact: true }).click();
    await p.evaluate(() => window.setVisibility("hidden"));
    await p.evaluate(() => window.setVisibility("visible"));
    await p.clock.runFor(3000);
    assert.deepEqual(stores, []);
    // A new attempt replaces the previous destination's store fallback.
    await sheet.getByRole("link", { name: "AMap", exact: true }).click();
    await p.clock.runFor(1000);
    await sheet.getByRole("link", { name: "Baidu Maps", exact: true }).click();
    await p.clock.runFor(2600);
    await p.waitForURL("https://apps.apple.com/app/id452186370");
    assert.deepEqual(stores, ["https://apps.apple.com/app/id452186370"]);
    await p.goto(base + "/volunteer");
    await p.getByRole("tab", { name: "Map", exact: true }).click();
    await panel.waitFor();
    await p.getByRole("button", { name: "Show my live location", exact: true }).click();
    await p.waitForFunction(() => window.watches.size === 1);
    assert.equal(await p.evaluate(() => window.lastGeoOptions.enableHighAccuracy), true);
    // A permission prompt that never resolves must not leave an endless spinner.
    await p.clock.fastForward(16000);
    await p.getByText("Your device could not locate you.", { exact: false }).waitFor();
    await p.evaluate(() => window.sendPosition());
    await p.getByText("Location updating", { exact: true }).waitFor();
    await panel.locator(".live-location-marker").waitFor();
    await p.evaluate(() => { window.savedMapElement = document.querySelector(".leaflet-container"); });
    await p.getByRole("button", { name: "Following me", exact: true }).click();
    const oldPath = await panel.locator(".live-location-marker").getAttribute("d");
    await p.evaluate(() => window.sendPosition(22.32, 114.17, 20));
    await p.waitForFunction(old => document.querySelector(".live-location-marker")?.getAttribute("d") !== old, oldPath);
    assert.equal(await p.evaluate(() => document.querySelector(".leaflet-container") === window.savedMapElement), true);
    await p.evaluate(() => window.sendPosition(22.32, 114.17, 150, 60000));
    await p.getByText("Location is out of date. Waiting for a fresh update…", { exact: true }).waitFor();
    assert.equal(await panel.locator(".live-location-marker").getAttribute("fill"), "#78716c");
    await p.getByText("Location accuracy is low. Check nearby landmarks.", { exact: true }).waitFor();
    await p.evaluate(() => window.sendPosition());
    await p.evaluate(() => window.setVisibility("hidden"));
    await p.waitForFunction(() => window.watches.size === 0);
    await p.getByText("Location paused while CareCall is in the background.", { exact: true }).waitFor();
    await p.evaluate(() => window.setVisibility("visible"));
    await p.waitForFunction(() => window.watches.size === 1);
    await p.evaluate(() => window.sendGeoError(2));
    await p.getByText("Your device could not locate you.", { exact: false }).waitFor();
    await p.evaluate(() => window.sendPosition());
    await p.getByText("Location updating", { exact: true }).waitFor();
    await p.evaluate(() => window.sendGeoError(1));
    await p.getByText("Location access is blocked.", { exact: false }).waitFor();
    await p.waitForFunction(() => window.watches.size === 0);
    assert.equal(await panel.locator(".live-location-marker").count(), 0);
    assert.equal(await start.isEnabled(), true);
    await p.getByRole("button", { name: "Show my live location", exact: true }).click();
    await p.waitForFunction(() => window.watches.size === 1);
    await p.evaluate(() => window.sendPosition());
    for (const language of ["zh-Hant", "zh-Hans", "en"]) {
      await p.locator("#language").selectOption(language);
      await p.locator(".navigation-panel .leaflet-container").waitFor();
      await p.locator(".navigation-start").click();
      const localizedSheet = p.locator("dialog[open]");
      const names = { "zh-Hant": ["高德地圖", "百度地圖"], "zh-Hans": ["高德地图", "百度地图"], en: ["AMap", "Baidu Maps"] }[language];
      for (const name of names) assert.equal(await localizedSheet.getByRole("link", { name, exact: true }).count(), 1);
      assert.equal(await localizedSheet.getByRole("link").count(), 4);
      await p.keyboard.press("Escape");
      await localizedSheet.waitFor({ state: "hidden" });
      const size = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert(size.scroll <= size.width + 1);
    }
    assert.deepEqual(errors, []);
    await p.setViewportSize({ width: 360, height: 740 });
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    if (process.env.CARECALL_SCREENSHOT_DIR) {
      mkdirSync(process.env.CARECALL_SCREENSHOT_DIR, { recursive: true });
      await panel.locator(".navigation-content").evaluate(el => { el.scrollTop = 0; });
      await p.screenshot({ path: process.env.CARECALL_SCREENSHOT_DIR + "/navigation-options.png" });
      await start.click();
      await sheet.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const sheetBounds = await sheet.boundingBox();
      assert(sheetBounds.y >= 0 && sheetBounds.y + sheetBounds.height <= 741);
      await p.screenshot({ path: process.env.CARECALL_SCREENSHOT_DIR + "/navigation-chooser.png" });
      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
      await sheet.waitFor({ state: "hidden" });
      await panel.locator(".location-map").scrollIntoViewIfNeeded();
      await p.waitForFunction(() => {
        const tiles = [...document.querySelectorAll(".leaflet-tile")];
        return tiles.length >= 2 && tiles.every(img => img.complete && img.naturalWidth > 0);
      }, undefined, { timeout: 20000 });
      await p.screenshot({ path: process.env.CARECALL_SCREENSHOT_DIR + "/navigation-live-map.png" });
    }
    await p.getByRole("tab", { name: "Conversation", exact: true }).click();
    await p.waitForFunction(() => window.watches.size === 0);
    await p.getByRole("tab", { name: "Map", exact: true }).click();
    await p.getByRole("button", { name: "Show my live location", exact: true }).click();
    await p.waitForFunction(() => window.watches.size === 1);
    await p.evaluate(() => window.sendPosition());
    await start.click();
    assert.equal((await resident.request.post(base + "/api/request/close", { data: { id: request.id } })).status(), 200);
    await p.waitForFunction(() => window.watches.size === 0);
    assert.equal(await p.getByRole("region", { name: "Get directions", exact: true }).count(), 0);
    assert.equal(await p.locator("dialog[open]").count(), 0);
    assert.deepEqual(routingRequests, []);
    assert.deepEqual(errors, []);
  } finally {
    for (const c of contexts) await c.request.delete(base + "/api/account");
    await browser.close();
  }
});
