"use client";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import type { RequestView } from "@/lib/types";

// Keep a fallback when browser storage is unavailable. No contact or location data.
const seen = new Set<string>();
export default function AcceptanceNotice({ requests }: { requests: RequestView[] }) {
  const { user, t } = useApp();
  const [visibleId, setVisibleId] = useState("");
  const accepted = requests.find(r => r.status === "ACCEPTED");
  const id = accepted?.id, acceptedAt = accepted?.acceptedAt, userId = user?.id;
  useEffect(() => {
    if (!id || !acceptedAt || !userId) return;
    // Restoring an old task should not produce a new acceptance notification.
    if (Date.now() - new Date(acceptedAt).getTime() > 30000) return;
    const key = `carecall_acceptance:${userId}:${id}`;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    queueMicrotask(() => {
      if (!live || seen.has(key)) return;
      try { if (sessionStorage.getItem(key)) return; } catch {}
      seen.add(key);
      try { sessionStorage.setItem(key, "1"); } catch {}
      setVisibleId(id);
      timer = setTimeout(() => setVisibleId(""), 5000);
    });
    return () => { live = false; clearTimeout(timer); };
  }, [id, acceptedAt, userId]);
  return (
    <div className="acceptance-notice-region" role="status" aria-live="polite" aria-atomic="true">
      {visibleId === id && accepted && <div className="acceptance-notice">
        <span className="acceptance-check" aria-hidden="true">✓</span>
        <p>{t(user?.role === "volunteer" ? "youAcceptedToast" : "matchedTitle")}</p>
        <button type="button" aria-label={t("dismissNotice")} onClick={() => setVisibleId("")}>×</button>
      </div>}
    </div>
  );
}
