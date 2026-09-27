// Mobile websites cannot query arbitrary installed apps. Arm this immediately
// before the user's native-link click; it is a conservative launch-failure
// fallback, not proof that an app is absent. Android also has a package intent
// fallback. Never send someone to a store after they have left for the map app.
export function scheduleMapStoreFallback(
  fallback: () => void,
  browser: Window = window,
  page: Document = document,
) {
  const delay = 2500;
  const expires = browser.performance.now() + 15000;
  let timer: number | undefined;
  let finished = false;

  function cancel() {
    finished = true;
    browser.clearTimeout(timer);
    page.removeEventListener("visibilitychange", visibility);
    browser.removeEventListener("pagehide", cancel);
    browser.removeEventListener("blur", pause);
    browser.removeEventListener("focus", resume);
  }
  function visibility() {
    if (page.visibilityState !== "visible") cancel();
  }
  function pause() {
    browser.clearTimeout(timer);
  }
  function resume() {
    if (finished) return;
    pause();
    const started = browser.performance.now();
    if (page.visibilityState !== "visible" || started >= expires) { cancel(); return; }
    timer = browser.setTimeout(() => {
      // Timers may be suspended while another app or a system prompt is open.
      // Do not interpret a late callback on return as a failed launch.
      const now = browser.performance.now();
      if (finished || page.visibilityState !== "visible" || now >= expires || now - started > delay + 1000) { cancel(); return; }
      if (!page.hasFocus()) return; // Wait for a dismissed system prompt.
      cancel();
      fallback();
    }, delay);
  }

  page.addEventListener("visibilitychange", visibility);
  browser.addEventListener("pagehide", cancel);
  browser.addEventListener("blur", pause);
  browser.addEventListener("focus", resume);
  resume();
  return cancel;
}
