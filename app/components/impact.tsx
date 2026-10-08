"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, useApp } from "./providers";
import type { Award, RewardSummary } from "@/lib/rewards";

function useRewards(refreshKey = "") {
  const { user } = useApp();
  const [data, setData] = useState<RewardSummary | null>(null), [error, setError] = useState("");
  useEffect(() => {
    if (user?.role !== "volunteer") return;
    let live = true;
    const update = async () => { try { const result = await api<RewardSummary>("/api/volunteer/rewards"); if (live) { setData(result); setError(""); } } catch (e) { if (live) setError((e as Error).message); } };
    void update(); const timer = setInterval(() => void update(), 15000);
    return () => { live = false; clearInterval(timer); };
  }, [user?.id, user?.role, refreshKey]);
  return { data, error };
}

export function Medal({ award }: { award: Award }) {
  const unlocked = !!award.earnedAt;
  return <svg className={"award-medal " + (unlocked ? "is-earned" : "is-locked")} viewBox="0 0 100 100" aria-hidden="true">
    <circle className="medal-disc" cx="50" cy="50" r="43" />
    <path d="m50 17 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7Z" fill="currentColor" />
    <text x="50" y="63" textAnchor="middle" fontSize={award.target >= 1000 ? "24" : "30"} fontWeight="650" fill="currentColor">{award.target}</text>
    {unlocked && <path d="m43 76 5 4 9-9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>;
}

function Ring({ value, target }: { value: number; target: number }) {
  return <svg className="impact-ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" opacity=".12" strokeWidth="6" /><circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.min(value / target, 1) * 100} 100`} transform="rotate(-90 32 32)" /><text x="32" y="38" textAnchor="middle" fontSize="18" fill="currentColor" fontWeight="750">{value >= target ? "✓" : value}</text></svg>;
}

export function ImpactSummary({ refreshKey }: { refreshKey: string }) {
  const { t } = useApp(), { data, error } = useRewards(refreshKey);
  return <Link className="impact-summary" href="/account/impact">
    <span className="impact-summary-mark" aria-hidden>✦</span>
    <span><strong>{data ? `${data.points} ${t("carePoints")}` : t("myImpact")}</strong><span>{error ? t(error) : data ? `${data.helps} ${t("helpsCompleted")} · ${t("viewAwards")}` : t("loading")}</span></span>
    <span aria-hidden>›</span>
  </Link>;
}

export default function Impact() {
  const { t, locale } = useApp(), { data, error } = useRewards();
  const [selected, setSelected] = useState<Award | null>(null), dialog = useRef<HTMLDialogElement>(null);
  const monthName = (month: string) => new Date(month + "-01T12:00:00Z").toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "Asia/Hong_Kong" });
  const date = (value: string) => new Date(value).toLocaleDateString(locale, { timeZone: "Asia/Hong_Kong", year: "numeric", month: "short", day: "numeric" });
  const label = (award: Award) => award.kind === "monthly" ? t("challenge_" + award.metric) : award.kind === "helps" && award.target === 1 ? t("firstHelpingHand") : `${award.target} ${t(award.kind === "helps" ? "helpingHands" : award.kind === "points" ? "carePoints" : "dayStreak")}`;
  const requirement = (award: Award) => t(award.kind === "monthly" ? "goal_" + award.metric : "goal_" + award.kind).replace("{n}", String(award.target));
  const open = (award: Award) => { setSelected(award); dialog.current?.showModal(); };
  if (!data) return <p role="status">{error ? t(error) : t("loading")}</p>;
  const gallery = (awards: Award[]) => <div className="award-grid">{awards.map(award => <button className={"award-tile " + (award.earnedAt ? "earned" : "locked")} key={award.code} onClick={() => open(award)} aria-label={`${label(award)} · ${t(award.earnedAt ? "awardEarned" : "awardLocked")}`}><Medal award={award} /><strong>{label(award)}</strong><span>{award.month ? monthName(award.month) : award.earnedAt ? t("awardEarned") : `${Math.min(award.progress, award.target)} / ${award.target}`}</span></button>)}</div>;
  return <>
    {error && <p role="alert" className="error">{t(error)}</p>}
    <section className="impact-hero" aria-label={t("carePoints")}>
      <p className="impact-total-label">{t("carePoints")}</p><p className="impact-total">{data.points.toLocaleString(locale)}</p>
      <div className="impact-stats"><div><strong>{data.helps}</strong><span>{t("helpsCompleted")}</span></div><div><strong>{data.currentStreak}</strong><span>{t("currentStreak")}</span></div><div><strong>{data.longestStreak}</strong><span>{t("bestStreak")}</span></div></div>
      {data.nextMilestone && <div className="impact-next"><span>{t("nextMilestone").replace("{n}", String(data.nextMilestone))}</span><strong>{data.helps} / {data.nextMilestone}</strong><progress value={data.helps} max={data.nextMilestone} aria-label={t("helpingHands")} /></div>}
    </section>
    <section aria-labelledby="monthly-heading" className="impact-section"><div className="impact-section-heading"><h2 id="monthly-heading">{t("monthlyChallenges")}</h2><span>{monthName(data.month)}</span></div>
      <div className="challenge-list">{data.challenges.map(award => <button className="challenge-card" key={award.code} onClick={() => open(award)}><Ring value={Math.min(award.progress, award.target)} target={award.target} /><span><strong>{label(award)}</strong><span>{requirement(award)}</span><b>{Math.min(award.progress, award.target)} / {award.target} · {t(award.earnedAt ? "awardEarned" : "inProgress")}</b></span><span className="challenge-arrow" aria-hidden>›</span></button>)}</div>
    </section>
    <section className="impact-section" aria-labelledby="helps-heading"><div className="impact-section-heading"><h2 id="helps-heading">{t("helpingHands")}</h2><span>{t("lifetimeAwards")}</span></div>{gallery(data.badges.filter(b => b.kind === "helps"))}</section>
    <section className="impact-section" aria-labelledby="points-heading"><h2 id="points-heading">{t("pointMilestones")}</h2>{gallery(data.badges.filter(b => b.kind === "points"))}</section>
    <section className="impact-section" aria-labelledby="streak-heading"><h2 id="streak-heading">{t("streakAwards")}</h2>{gallery(data.badges.filter(b => b.kind === "streak"))}</section>
    {data.pastMonthly.length > 0 && <section className="impact-section"><h2>{t("pastChallenges")}</h2>{gallery(data.pastMonthly)}</section>}
    <dialog ref={dialog} className="award-dialog" aria-labelledby="award-title" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      {selected && <><button className="drawer-close" aria-label={t("closeMenu")} onClick={() => dialog.current?.close()}>×</button><Medal award={selected} /><p className="eyebrow">{selected.month ? monthName(selected.month) : t("lifetimeAwards")}</p><h2 id="award-title">{label(selected)}</h2><p>{requirement(selected)}</p><p className="award-dialog-status">{selected.earnedAt ? `${t("awardEarned")} · ${date(selected.earnedAt)}` : `${Math.min(selected.progress, selected.target)} / ${selected.target} · ${t("inProgress")}`}</p><button className="button w-full" onClick={() => dialog.current?.close()}>{t("back")}</button></>}
    </dialog>
  </>;
}
