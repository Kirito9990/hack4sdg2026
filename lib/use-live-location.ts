"use client";

import { useEffect, useState } from "react";

export type LivePosition = { lat: number; lng: number; accuracy: number; timestamp: number };

// This location stays in memory, only for the visible navigation panel.
export function useLiveLocation(startEnabled = false) {
  const [enabled, setEnabled] = useState(startEnabled);
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(true);
  const [now, setNow] = useState(0);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let watch: number | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let generation = 0;
    const clear = () => {
      generation++;
      if (watch !== undefined) navigator.geolocation?.clearWatch(watch);
      watch = undefined;
      clearTimeout(deadline);
    };
    const start = () => {
      clear();
      const token = generation;
      setVisible(document.visibilityState === "visible");
      setNow(Date.now());
      if (document.visibilityState !== "visible") return;
      setError("");
      setWaiting(true);
      if (!navigator.geolocation || !window.isSecureContext) {
        setError("locationUnsupported");
        setEnabled(false);
        return;
      }
      deadline = setTimeout(() => {
        if (token === generation) setError("locationUnavailable");
      }, 15000);
      watch = navigator.geolocation.watchPosition((p) => {
        if (token !== generation) return;
        const { latitude: lat, longitude: lng, accuracy } = p.coords;
        if (![lat, lng, accuracy, p.timestamp].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || accuracy < 0) return;
        clearTimeout(deadline);
        setPosition({ lat, lng, accuracy, timestamp: p.timestamp });
        setWaiting(false);
        setNow(Date.now());
        setError("");
      }, (e) => {
        if (token !== generation) return;
        clearTimeout(deadline);
        setError(e.code === 1 ? "locationDenied" : "locationUnavailable");
        if (e.code === 1) {
          clear();
          setPosition(null);
          setEnabled(false);
        }
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
    };
    // Schedule initial state updates outside the effect's synchronous body.
    const initial = setTimeout(start, 0);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    document.addEventListener("visibilitychange", start);
    return () => {
      clearTimeout(initial);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", start);
      clear();
    };
  }, [enabled]);

  const stale = !enabled || !visible || waiting || !!error || !position || now - position.timestamp > 30000;
  return {
    enabled, position, error, visible, stale,
    start: () => { setPosition(null); setError(""); setEnabled(true); },
    stop: () => { setEnabled(false); setPosition(null); setError(""); },
  };
}
