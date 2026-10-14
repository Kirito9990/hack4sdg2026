"use client";
import { useEffect, useRef, useState } from "react";
import { api, post, useApp } from "@/app/components/providers";
import { useRoleProfile } from "@/lib/profile";
import { useLocation, useRequests } from "@/lib/client-hooks";
import LocationPicker from "@/app/components/location-picker";
import HistoryList from "@/app/components/history-list";
import Community from "@/app/components/community";
import RequestPanel from "@/app/components/request-panel";
import PriorityCard from "@/app/components/priority-card";
import VolunteerLocationSharing from "@/app/components/volunteer-location-sharing";
import AcceptanceNotice from "@/app/components/acceptance-notice";
import { ImpactSummary } from "@/app/components/impact";
import { unseenTasks, waitingParts } from "@/lib/request-priority";
import type { RequestCategory, UrgencyLevel, User } from "@/lib/types";
type Task = {
  rewardPoints: number;
  id: string;
  lat: number;
  lng: number;
  category: RequestCategory;
  urgency_level: UrgencyLevel;
  source: string;
  requirements?: string[];
  tools?: string[];
  resources?: string[];
  distanceMeters: number;
  createdAt?: string;
};
function waitingLabel(createdAt: string | undefined, t: (key: string) => string) {
  if (!createdAt) return "";
  const parts = waitingParts(createdAt);
  if (parts.key === "waitingNow") return t("waitingNow");
  return t("waitingFor") + " " + parts.count + " " + t(parts.key);
}
export default function Volunteer() {
  const { t, user, setUser } = useApp(),
    { ready, profile } = useRoleProfile("volunteer"),
    geo = useLocation(!!profile),
    feed = useRequests(!!profile);
  const [tasks, setTasks] = useState<Task[]>([]),
    [error, setError] = useState(""),
    [accepting, setAccepting] = useState(""),
    [tab, setTab] = useState("allTasks"),
    [shiftBusy, setShiftBusy] = useState(false),
    [incoming, setIncoming] = useState<{ task: Task; count: number } | null>(null);
  const seenTasks = useRef<Set<string> | null>(null),
    incomingDialog = useRef<HTMLDialogElement>(null);
  const available = !!user?.available,
    active = feed.requests.find((r) => r.status === "ACCEPTED");
  const request = active;
  // An incoming or restored active assignment always opens the task workspace.
  const actualTab = active && tab === "allTasks" ? "activity"
    : !active && tab === "activity" ? "history" : tab;
  useEffect(() => {
    if (!geo.coords || !profile || !available) return;
    let live = true;
    const poll = async () => {
      try {
        const b = await api<{ tasks: Task[] }>(
          "/api/volunteer/tasks?lat=" +
            geo.coords!.lat +
            "&lng=" +
            geo.coords!.lng,
        );
        if (live) {
          const arrival = unseenTasks(seenTasks.current, b.tasks);
          seenTasks.current = arrival.seen;
          if (arrival.fresh.length) setIncoming({ task: arrival.fresh[0], count: arrival.fresh.length });
          setTasks(b.tasks);
          setError("");
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 2500);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [geo.coords, profile, available]);
  useEffect(() => {
    const node = incomingDialog.current;
    if (!node) return;
    if (incoming && !node.open) node.showModal();
    if (!incoming && node.open) node.close();
  }, [incoming]);
  if (!ready || !profile) return <main className="page">{t("loading")}</main>;
  return (
    <main className={"mobile-app" + (actualTab === "activity" && active ? " active-task" : "")}>
      <AcceptanceNotice requests={feed.requests} />
      <dialog
        ref={incomingDialog}
        className="incoming-request-dialog"
        aria-labelledby="incoming-request-title"
        onClose={() => setIncoming(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) incomingDialog.current?.close();
        }}
      >
        {incoming && (
          <>
            <button className="drawer-close" aria-label={t("closeMenu")} onClick={() => incomingDialog.current?.close()}>×</button>
            <p className="eyebrow">{t("newRequestTitle")}</p>
            <h2 id="incoming-request-title">{t(incoming.task.category)}</h2>
            <p>
              <span className="priority-pill">{t(incoming.task.source === "fallback" ? "notAssessed" : incoming.task.urgency_level)}</span>
              {" · "}
              {t("approx")} {(incoming.task.distanceMeters / 1000).toFixed(1)} {t("km")}
            </p>
            {incoming.count > 1 && <p>{t("newRequestMore").replace("{n}", String(incoming.count))}</p>}
            <button
              className="button w-full"
              type="button"
              onClick={() => {
                setTab("allTasks");
                incomingDialog.current?.close();
              }}
            >
              {t("viewRequests")}
            </button>
          </>
        )}
      </dialog>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">{t("volunteer")}</p>
          <h1>
            {t(
              actualTab === "activity"
                ? "currentTask"
                : actualTab === "history"
                  ? "history"
                  : actualTab === "community"
                    ? "community"
                    : "nearby",
            )}
          </h1>
        </div>
        <button
          role="switch"
          aria-checked={available}
          aria-label={t("shiftLabel")}
          className={"shift-toggle " + (available ? "on" : "")}
          disabled={shiftBusy || !!active}
          title={active ? t("shiftLocked") : undefined}
          onClick={async () => {
            setShiftBusy(true);
            try {
              const b = await api<{ user: User }>("/api/volunteer/shift", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ available: !available }),
              });
              setUser(b.user);
              setTasks([]);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setShiftBusy(false);
            }
          }}
        >
          <span className="switch-track">
            <i />
          </span>
          {t(available ? "onShift" : "offShift")}
        </button>
      </div>
      {active && user?.privacy.shareLocation && <VolunteerLocationSharing key={active.id} requestId={active.id} />}
      {(error || feed.error) && (
        <p role="alert" className="error">
          {t(error || feed.error)}
        </p>
      )}
      {actualTab === "allTasks" &&
        feed.requests[0]?.closedReason === "completed" && (
          <button
            className="status-banner status-complete text-left"
            onClick={() => {
              setTab("history");
            }}
          >
            <span aria-hidden>✓</span>
            <span role="status">{t("residentConfirmed")}</span>
          </button>
        )}
      <div className="app-stage">
        {actualTab === "allTasks" && <ImpactSummary refreshKey={feed.requests.map(r => r.id + r.status).join(",")} />}
        {actualTab === "community" ? <Community /> : actualTab === "history" ? <HistoryList requests={feed.requests.filter(r=>r.status==="CLOSED")}/> : actualTab === "activity" ? (
          <div className="activity-stage">
            {request ? (
              <RequestPanel
                key={request.id}
                request={request}
                refresh={feed.refresh}
              />
            ) : (
              <div className="empty-state">
                <span aria-hidden>◷</span>
                <h2>{t("noActiveTask")}</h2>
                <button className="button" onClick={() => setTab("allTasks")}>
                  {t("nearby")}
                </button>
              </div>
            )}
          </div>
        ) : !available ? (
          <div className="empty-state">
            <span aria-hidden>☾</span>
            <h2>{t("offShift")}</h2>
            <p>{t("offShiftHint")}</p>
            <p className="text-sm text-muted">{t("shiftHint")}</p>
          </div>
        ) : !geo.coords ? (
          <div className="stage-scroll">
            <LocationPicker
              coords={geo.coords}
              locating={geo.locating}
              error={geo.error}
              onLocate={geo.retry}
              onPick={geo.pick}
            />
          </div>
        ) : (
          <div className="stage-scroll">
            <p className="text-sm text-muted mb-3">{t("nearbyHint")}</p>
            <p className="text-sm text-muted mb-3">{t("priorityOrder")}</p>
            {tasks.length ? (
              <ul className="task-list">
                {tasks.map((task, index) => (
                  <li key={task.id}>
                    <PriorityCard {...task} rank={index + 1} />
                    {task.rewardPoints > 0 && <p className="task-reward">✦ {task.rewardPoints} {t("rewardOffer")}</p>}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <span className="text-sm">
                        {task.createdAt ? (
                          <span className="waiting-time">{waitingLabel(task.createdAt, t)}</span>
                        ) : null}
                        {task.createdAt ? " · " : ""}
                        {t("approx")} {(task.distanceMeters / 1000).toFixed(1)}{" "}
                        {t("km")}
                      </span>
                      <button
                        className="button"
                        disabled={!!accepting}
                        onClick={async () => {
                          setAccepting(task.id);
                          setError("");
                          try {
                            await post("/api/volunteer/accept", {
                              id: task.id,
                              ...geo.coords,
                            });
                            await feed.refresh();
                            setTab("activity");
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setAccepting("");
                          }
                        }}
                      >
                        {t(accepting === task.id ? "accepting" : "accept")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <h2>{t("noTasks")}</h2>
                <p>{t("autoRefresh")}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <nav className="bottom-tabs" aria-label={t("volunteer")}>
        {["allTasks", "activity", "community", "history"]
          .filter((k) => k !== "activity" || !!active)
          .map((k) => (
          <button
            key={k}
            aria-current={actualTab === k ? "page" : undefined}
            onClick={() => setTab(k)}
          >
            {t(k)}
          </button>
        ))}
      </nav>
    </main>
  );
}
