import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47295";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));

test("location recovers from old denials without overwriting account consent", async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const contexts = [], errors = []; let nextPhone = 65000000;
  async function context(permission = "denied") {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 Version/18.4 Mobile/15E148 Safari/604.1" });
    contexts.push(c);
    await c.addInitScript(permission => {
      localStorage.setItem("carecall_location_choice", "blocked"); // Legacy website data.
      window.geoCalls = 0;
      window.geoMode = "denied";
      window.permission = Object.assign(new EventTarget(), { state: "denied" });
      Object.defineProperty(navigator, "permissions", { value: permission === "missing" ? undefined : {
        query: () => permission === "throws" ? Promise.reject(new Error("Unsupported permission")) : Promise.resolve(window.permission),
      } });
      Object.defineProperty(navigator.geolocation, "getCurrentPosition", { value: (ok, fail) => {
        window.geoCalls++;
        window.lateGeoFailure = fail;
        if (window.geoMode === "pending") return;
        setTimeout(() => window.geoMode === "success" ? ok({ coords: { latitude: 22.3193, longitude: 114.1694 } }) : fail({ code: window.geoMode === "denied" ? 1 : 2 }), 0);
      } });
    }, permission);
    const p = await c.newPage();
    p.on("pageerror", e => errors.push(e.message));
    return { c, p };
  }
  async function create(c, role, allowLocation = false) {
    const r = await c.request.post(base + "/api/auth", { data: { mode: "create", name: "Location recovery", phone: String(++nextPhone), role, allowLocation, privacyAccepted: true, password: "test-password-1" } });
    assert.equal(r.status(), 200);
  }
  try {
    const { c, p } = await context();
    await create(c, "volunteer", true);
    const locationWrites = [];
    p.on("request", r => { if (r.url().endsWith("/api/account/location") && r.method() === "PATCH") locationWrites.push(r.postDataJSON()); });
    await p.goto(base + "/volunteer");
    await p.getByRole("switch").click();
    await p.getByRole("button", { name: "Use my location", exact: true }).waitFor();
    assert.equal(await p.getByText("Location access is blocked.", { exact: false }).count(), 0);
    assert.equal(await p.evaluate(() => window.geoCalls), 0);
    await p.getByRole("button", { name: "Use my location", exact: true }).click();
    await p.getByText("Location access is blocked.", { exact: false }).waitFor();
    assert.equal((await (await c.request.get(base + "/api/auth")).json()).user.privacy.allowLocation, true);
    assert.equal(locationWrites.some(b => b.allowed === false), false);
    // The browser query can disagree with GPS. A successful retry is authoritative.
    await p.evaluate(() => { window.geoMode = "success"; });
    const nearby = p.waitForResponse(r => r.url().includes("/api/volunteer/tasks?lat=22.3193") && r.status() === 200);
    await p.getByRole("button", { name: "Use my location", exact: true }).click();
    await nearby;
    await p.getByRole("button", { name: "Use my location", exact: true }).waitFor({ state: "hidden" });
    await p.evaluate(() => window.permission.dispatchEvent(new Event("change")));
    assert.equal(await p.getByText("Location access is blocked.", { exact: false }).count(), 0);
    assert.equal(locationWrites.some(b => b.allowed === false), false);
    assert.equal((await (await c.request.get(base + "/api/auth")).json()).user.privacy.allowLocation, true);
    assert.equal(await p.evaluate(() => window.geoCalls), 2);

    // Signup retries even with an old saved denial and no Permissions API.
    const { p: login } = await context("missing");
    await login.goto(base + "/login");
    await login.evaluate(() => { window.geoMode = "success"; });
    await login.getByRole("button", { name: "First time here? Create account", exact: true }).click();
    await login.getByRole("textbox", { name: "Your name", exact: true }).fill("Location signup");
    await login.getByRole("textbox", { name: "Phone number", exact: true }).fill("61234567");
    await login.getByRole("textbox", { name: "Password", exact: true }).fill("test-password-1");
    await login.locator("#privacy-consent").check();
    await login.getByRole("button", { name: "Create account", exact: true }).click();
    await login.getByRole("heading", { name: "Request help", exact: true }).waitFor();
    assert.equal(await login.evaluate(() => window.geoCalls), 0);

    // Sending without a point also retries; a manual account opt-out is not an OS denial.
    const { c: rc, p: resident } = await context("throws");
    await create(rc, "resident");
    await resident.goto(base + "/resident");
    await resident.getByRole("button", { name: "Send request", exact: true }).waitFor();
    assert.equal(await resident.getByText("Location access is blocked.", { exact: false }).count(), 0);
    await resident.evaluate(() => { window.geoMode = "success"; });
    await resident.getByRole("textbox", { name: "Description / editable transcript", exact: true }).fill("Location recovery test");
    await resident.getByRole("button", { name: "Send request", exact: true }).click();
    await resident.getByRole("heading", { name: "Request sent successfully", exact: true }).waitFor();
    assert.equal(await resident.evaluate(() => window.geoCalls), 1);

    // A timed-out request must not later replace its error with a stale denial.
    const { c: pc, p: pending } = await context("missing");
    await create(pc, "volunteer");
    await pending.goto(base + "/volunteer");
    await pending.getByRole("switch").click();
    await pending.clock.install();
    await pending.evaluate(() => { window.geoMode = "pending"; });
    await pending.getByRole("button", { name: "Use my location", exact: true }).click();
    await pending.clock.fastForward(16000);
    await pending.getByText("Your device could not locate you.", { exact: false }).waitFor();
    await pending.evaluate(() => window.lateGeoFailure({ code: 1 }));
    assert.equal(await pending.getByText("Location access is blocked.", { exact: false }).count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    for (const c of contexts) await c.request.delete(base + "/api/account");
    await browser.close();
  }
});
