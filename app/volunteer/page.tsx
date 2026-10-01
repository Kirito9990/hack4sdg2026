"use client";
import { useEffect, useState } from "react";
import { api, post, useApp } from "@/app/components/providers";
import { useRoleProfile } from "@/lib/profile";
import { useLocation, useRequests } from "@/lib/client-hooks";
import LocationPicker from "@/app/components/location-picker";
import HistoryList from "@/app/components/history-list";
import RequestPanel from "@/app/components/request-panel";
import PriorityCard from "@/app/components/priority-card";
import VolunteerLocationSharing from "@/app/components/volunteer-location-sharing";
import AcceptanceNotice from "@/app/components/acceptance-notice";
import type { RequestCategory, UrgencyLevel, User } from "@/lib/types";
type Task = {
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
};
export default function Volunteer() {
  const { t, user, setUser } = useApp(),
    { ready, profile } = useRoleProfile("volunteer"),
    geo = useLocation(!!profile),
    feed = useRequests(!!profile);
  const [tasks, setTasks] = useState<Task[]>([]),
    [error, setError] = useState(""),
    [accepting, setAccepting] = useState(""),
    [tab, setTab] = useState("allTasks"),
    [selected, setSelected] = useState(""),
    [shiftBusy, setShiftBusy] = useState(false);
  const available = !!user?.available,
    active = feed.requests.find((r) => r.status === "ACCEPTED");
  const request =
    feed.requests.find((r) => r.id === selected) || active || feed.requests[0];
  // An incoming or restored active assignment always opens the task workspace.
  const actualTab = active && tab === "allTasks" ? "activity" : tab;
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
  if (!ready || !profile) return <main className="page">{t("loading")}</main>;
  return (
    <main className={"mobile-app" + (actualTab === "activity" && active ? " active-task" : "")}>
      <AcceptanceNotice requests={feed.requests} />
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">{t("volunteer")}</p>
          <h1>
            {t(
              actualTab === "activity"
                ? "currentTask"
                : actualTab === "history"
                  ? "history"
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
              setSelected(feed.requests[0].id);
              setTab("activity");
            }}
          >
            <span aria-hidden>✓</span>
            <span role="status">{t("residentConfirmed")}</span>
          </button>
        )}
      <div className="app-stage">
        {actualTab === "history" ? <HistoryList requests={feed.requests.filter(r=>r.status==="CLOSED")}/> : actualTab === "activity" ? (
          <div className="activity-stage">
            {feed.requests.length > 1 && (
              <select
                className="request-picker"
                aria-label={t("chooseRequest")}
                value={request?.id || ""}
                onChange={(e) => setSelected(e.target.value)}
              >
                {feed.requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t(r.status === "CLOSED" ? "closed" : "currentTask")} ·{" "}
                    {t(r.category)} · {r.id.slice(0, 6)}
                  </option>
                ))}
              </select>
            )}
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
            {tasks.length ? (
              <ul className="task-list">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <PriorityCard {...task} />
                    <div className="flex items-center justify-between gap-3 p-3">
                      <span className="text-sm">
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
                            setSelected(task.id);
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
        {[
          ["allTasks", "⌕"],
          ["activity", "◷"],
          ["history", "◴"],
        ].map(([k, icon]) => (
          <button
            key={k}
            aria-current={actualTab === k ? "page" : undefined}
            onClick={() => setTab(k)}
          >
            <span aria-hidden>{icon}</span>
            {t(k)}
          </button>
        ))}
      </nav>
    </main>
  );
}
