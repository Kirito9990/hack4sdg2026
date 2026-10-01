"use client";
import { useState } from "react";
import { useApp } from "./providers";
import { Conversation } from "./request-panel";
import ExtractedContent from "./extracted-content";
import type { RequestView } from "@/lib/types";

export default function HistoryList({ requests }: { requests: RequestView[] }) {
  const { t, locale } = useApp();
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("historySummary");
  const r = requests.find(item => item.id === selected);
  if (r) return <section className="history-detail" aria-label={t("historyDetails")}>
    <button type="button" className="history-back" onClick={() => setSelected("")}>‹ {t("backToHistory")}</button>
    <div className="history-heading"><h2>{t(r.category)}</h2><p>{new Date(r.closedAt || r.createdAt).toLocaleDateString(locale)} · {t(r.closedReason === "completed" ? "completedTitle" : "closed")}</p></div>
    <div className="segmented" role="tablist" aria-label={t("historyDetails")}>
      {["historySummary", "conversation"].map(key => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{t(key)}</button>)}
    </div>
    {tab === "conversation" ? <Conversation key={r.id} request={r} /> : <div className="stage-scroll history-summary">
      <dl><dt>{t("historyStarted")}</dt><dd>{new Date(r.createdAt).toLocaleString(locale)}</dd>
        {r.closedAt && <><dt>{t("historyFinished")}</dt><dd>{new Date(r.closedAt).toLocaleString(locale)}</dd></>}
      </dl>
      <p className="whitespace-pre-wrap break-words">{r.summary === "mediaRequest" ? t("mediaRequest") : r.summary}</p>
      {r.transcript && r.transcript !== r.summary && <p className="whitespace-pre-wrap break-words">{r.transcript}</p>}
      <ExtractedContent request={r} />
      {r.imageHidden && <p>{t("historyPhotoHidden")}</p>}
      <p className="text-sm text-muted">{t("historyPrivacy")}</p>
      <p className="text-sm text-muted">{t("historySevenDays")}</p>
    </div>}
  </section>;
  return <div className="stage-scroll history-list"><p className="text-sm text-muted">{t("historySevenDays")}</p>{requests.length ? requests.map(r => <button className="history-item" key={r.id} onClick={() => { setSelected(r.id); setTab("historySummary"); }}><span><strong>{t(r.category)}</strong><span className="block text-sm">{new Date(r.closedAt || r.createdAt).toLocaleDateString(locale)} · {t(r.closedReason === "completed" ? "completedTitle" : "closed")}</span></span><span aria-hidden>›</span></button>) : <div className="empty-state">{t("noHistory")}</div>}</div>;
}
