import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.CARECALL_TEST_URL || "http://127.0.0.1:47291";
assert(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "UI tests must stay local",
);
const password = "test-password-1";

test("password visibility toggles on login and registration", async () => {
  const health = await fetch(base + "/api/health").catch(() => null);
  assert.equal(health?.ok, true, "Start the local CareCall server before this test");
  const stamp = String(Date.now()).slice(-7);
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator.geolocation, "getCurrentPosition", {
      value: (ok) => {
        setTimeout(
          () => ok({ coords: { latitude: 22.3193, longitude: 114.1694 } }),
          0,
        );
      },
    });
  });
  const page = await context.newPage();
  try {
    await page.goto(base + "/login");
    const field = page.locator("#account-password");
    const toggle = page.getByRole("button", { name: "Show password", exact: true });
    await field.waitFor();
    assert.equal(await field.getAttribute("type"), "password");
    await page.getByRole("textbox", { name: "Phone number", exact: true }).fill("61230001");
    await field.fill(password);
    await toggle.click();
    assert.equal(page.url().endsWith("/login"), true);
    assert.equal(await page.getByRole("alert").count(), 0);
    assert.equal(await field.getAttribute("type"), "text");
    assert.equal(await field.inputValue(), password);
    const shown = page.getByRole("button", { name: "Hide password", exact: true });
    assert.equal(await shown.getAttribute("aria-pressed"), "true");
    const box = await shown.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44);
    await shown.focus();
    await page.keyboard.press("Enter");
    assert.equal(await field.getAttribute("type"), "password");
    assert.equal(await field.inputValue(), password);
    assert.equal(page.url().endsWith("/login"), true);

    await page.locator("#language").selectOption("zh-Hant");
    await page.getByRole("button", { name: "顯示密碼", exact: true }).waitFor();
    await page.locator("#language").selectOption("zh-Hans");
    await page.getByRole("button", { name: "显示密码", exact: true }).waitFor();
    await page.locator("#language").selectOption("en");

    await page.getByRole("button", { name: "First time here? Create account", exact: true }).click();
    assert.equal(await field.getAttribute("type"), "password");
    assert.equal(await field.inputValue(), password);
    await page.getByRole("button", { name: "Show password", exact: true }).click();
    assert.equal(await field.getAttribute("type"), "text");
    assert.equal(await field.inputValue(), password);
    await page.getByRole("button", { name: "Hide password", exact: true }).click();
    assert.equal(await field.getAttribute("type"), "password");

    const loginPhone = "6" + stamp;
    const createdLogin = await context.request.post(base + "/api/auth", {
      data: {
        mode: "create",
        name: "Visibility Login",
        phone: loginPhone,
        role: "resident",
        password,
        privacyAccepted: true,
      },
    });
    assert.equal(createdLogin.status(), 200);
    await context.request.delete(base + "/api/auth");
    await page.goto(base + "/login");
    await page.getByRole("textbox", { name: "Phone number", exact: true }).fill(loginPhone);
    await page.locator("#account-password").fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByRole("button", { name: "Send request", exact: true }).waitFor();
    await context.request.delete(base + "/api/account");

    const signupPhone = "7" + stamp;
    await page.goto(base + "/login");
    await page.getByRole("button", { name: "First time here? Create account", exact: true }).click();
    await page.getByRole("textbox", { name: "Your name", exact: true }).fill("Visibility Signup");
    await page.getByRole("textbox", { name: "Phone number", exact: true }).fill(signupPhone);
    await page.locator("#account-password").fill(password);
    await page.locator("#privacy-consent").check();
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.getByRole("button", { name: "Send request", exact: true }).waitFor();
    await context.request.delete(base + "/api/account");
  } finally {
    await browser.close();
  }
});
