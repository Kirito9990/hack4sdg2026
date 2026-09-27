"use client";
import { useApp } from "./providers";
import type { RequestView } from "@/lib/types";

export function ProgressLink({ onOpen }: { onOpen: () => void }) {
  const { t } = useApp();
  return <button type="button" className="progress-link" onClick={onOpen} aria-label={t("viewProgress")}>
    <span className="activity-connection" aria-hidden="true"><i /><span /><i /></span>
    <span>{t("helpInProgress")}</span><span className="progress-chevron" aria-hidden="true">›</span>
  </button>;
}

export default function RequestProgress({ request: r }: { request: RequestView }) {
  const { t, locale } = useApp();
  const active = r.status === "ACCEPTED";
  const finished = r.status === "CLOSED";
  const time = (value?: string) => value ? new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "";
  const stages = [
    { label: "progressRequested", at: r.createdAt, done: true },
    { label: "progressMatched", at: r.acceptedAt, done: !!r.acceptedAt },
    { label: r.closedReason === "cancelled" ? "closed" : "completedTitle", at: r.closedAt, done: finished },
  ];
  return <section className="journey-progress" aria-label={t("progressTab")}>
    {active && <>
      <div className="journey-connection" aria-hidden="true">
        <div className="journey-endpoint"><span>♡</span><small>{t("volunteer")}</small></div>
        <div className="activity-connection"><i /><span /><i /></div>
        <div className="journey-endpoint"><span>⌂</span><small>{t("resident")}</small></div>
      </div>
      <h2>{t("helpInProgress")}</h2>
      <p className="journey-hint">{t("progressHelpingHint")}</p>
    </>}
    <ol className="journey-timeline">
      {stages.map((stage, i) => <li key={stage.label} className={stage.done ? "done" : ""} aria-current={active && i === 1 ? "step" : undefined}>
        <span className="journey-step-dot" aria-hidden="true">{stage.done ? "✓" : ""}</span>
        <span>{t(stage.label)}</span>
        {stage.at ? <time dateTime={new Date(stage.at).toISOString()}>{time(stage.at)}</time> : <small>{t("progressWaiting")}</small>}
      </li>)}
    </ol>
  </section>;
}
