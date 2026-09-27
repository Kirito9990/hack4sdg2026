"use client";
import { useEffect, useRef, useState } from "react";
import { useLiveLocation } from "@/lib/use-live-location";
import { useApp } from "./providers";

export default function VolunteerLocationSharing({ requestId }: { requestId: string }) {
  const { t } = useApp();
  const geo = useLiveLocation(true);
  const latest = useRef(geo);
  const publish = useRef<(() => void) | undefined>(undefined);
  const [sent, setSent] = useState(false);
  useEffect(() => { latest.current = geo; publish.current?.(); }, [geo]);
  useEffect(() => {
    let live = true, lastSent = 0, lastTimestamp = 0;
    let queue = Promise.resolve();
    // Serialize removal after uploads, so a delayed upload cannot resurrect a
    // point after this component stops sharing. All requests are tiny keepalives.
    const enqueue = (method: "PATCH" | "DELETE", body: object) => {
      queue = queue.catch(() => {}).then(async () => {
        const response = await fetch("/api/request/location", { method, keepalive: true,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (live) setSent(method === "PATCH" && response.ok);
      });
      void queue.catch(() => { if (live) setSent(false); });
    };
    const clear = () => { lastTimestamp = 0; lastSent = 0; enqueue("DELETE", { id: requestId }); };
    const send = () => {
      const current = latest.current;
      if (!live || document.visibilityState !== "visible" || current.stale || !current.position) return;
      if (current.position.timestamp === lastTimestamp || Date.now() - lastSent < 10000) return;
      lastTimestamp = current.position.timestamp;
      lastSent = Date.now();
      enqueue("PATCH", { id: requestId, ...current.position });
    };
    publish.current = send;
    const tick = setInterval(send, 10000);
    const visibility = () => { if (document.visibilityState !== "visible") clear(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", clear);
    send();
    return () => {
      live = false;
      publish.current = undefined;
      clearInterval(tick);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", clear);
      clear();
    };
  }, [requestId]);
  return <p className="sharing-status" role="status">{t(geo.error ? geo.error : sent && !geo.stale ? "locationShared" : "locationSharingWaiting")}</p>;
}
