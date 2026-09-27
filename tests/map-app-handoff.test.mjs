import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduleMapStoreFallback } from "../lib/map-app-handoff.ts";

function environment() {
  const browser = new EventTarget(), page = new EventTarget();
  let now = 0, id = 0, focused = true, redirects = 0;
  const timers = new Map();
  browser.performance = { now: () => now };
  browser.setTimeout = (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id; };
  browser.clearTimeout = id => timers.delete(id);
  page.visibilityState = "visible";
  page.hasFocus = () => focused;
  return {
    start: () => scheduleMapStoreFallback(() => redirects++, browser, page),
    tick(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } },
    visibility(state) { page.visibilityState = state; page.dispatchEvent(new Event("visibilitychange")); },
    event(type) { if (type === "blur") focused = false; if (type === "focus") focused = true; browser.dispatchEvent(new Event(type)); },
    get redirects() { return redirects; },
    get pending() { return timers.size; },
  };
}

test("failed native launch falls back once while the page stays visible and focused", () => {
  const e = environment(); e.start();
  e.tick(2499); assert.equal(e.redirects, 0);
  e.tick(1); assert.equal(e.redirects, 1);
  e.event("focus"); e.tick(2500); assert.equal(e.redirects, 1);
  assert.equal(e.pending, 0);
});
test("leaving for an app permanently cancels fallback, including on immediate return", () => {
  for (const leave of [e => e.visibility("hidden"), e => e.event("pagehide")]) {
    const e = environment(); e.start(); leave(e);
    e.visibility("visible"); e.event("focus"); e.tick(2500);
    assert.equal(e.redirects, 0); assert.equal(e.pending, 0);
  }
});
test("system prompts pause fallback and allow a fresh grace period when dismissed", () => {
  const e = environment(); e.start(); e.event("blur");
  e.tick(4000); assert.equal(e.redirects, 0);
  e.event("focus"); e.tick(2499); assert.equal(e.redirects, 0);
  e.tick(1); assert.equal(e.redirects, 1);
});
test("late timers or late focus cannot redirect after a suspended app or prompt", () => {
  const delayed = environment(); delayed.start(); delayed.tick(6000);
  assert.equal(delayed.redirects, 0);
  const prompt = environment(); prompt.start(); prompt.event("blur"); prompt.tick(16000);
  prompt.event("focus"); prompt.tick(2500);
  assert.equal(prompt.redirects, 0); assert.equal(prompt.pending, 0);
});
test("dismissal, unmount and replacing a handoff cancel the previous fallback", () => {
  const e = environment(), cancel = e.start();
  cancel(); cancel(); e.event("focus"); e.tick(2500);
  assert.equal(e.redirects, 0);
  const old = e.start(); old(); e.start(); e.tick(2500);
  assert.equal(e.redirects, 1);
});
