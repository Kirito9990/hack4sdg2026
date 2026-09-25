"use client";
import { useEffect, useState } from "react";
import { api, post, useApp } from "@/app/components/providers";
import { useRoleProfile } from "@/lib/profile";
import { useLocation, useRequests } from "@/lib/client-hooks";
import LocationMap from "@/app/components/location-map";
import RequestPanel from "@/app/components/request-panel";
import type { RequestCategory, UrgencyLevel } from "@/lib/types";
type Task = {
  id: string;
  lat: number;
  lng: number;
  category: RequestCategory;
  urgency_level: UrgencyLevel;
  source: string;
  distanceMeters: number;
};
export default function Volunteer() {
  const { t } = useApp(),
    { ready, profile } = useRoleProfile("volunteer"),
    geo = useLocation(!!profile),
    feed = useRequests(!!profile),
    [tasks, setTasks] = useState<Task[]>([]),
    [error, setError] = useState(""),
    [accepting, setAccepting] = useState("");
  const active = feed.requests.filter((r) => r.status === "ACCEPTED");
  useEffect(() => {
    if (!geo.coords || !profile) return;
    let live = true;
    const url =
      "/api/volunteer/tasks?lat=" + geo.coords.lat + "&lng=" + geo.coords.lng;
    const poll = async () => {
      try {
        const b = await api<{ tasks: Task[] }>(url);
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
  }, [geo.coords, profile]);
  if (!ready || !profile)
    return (
      <main className="page">
        <p>{t("loading")}</p>
      </main>
    );
  return (
    <main className="page max-w-6xl">
      <h1>{t("nearby")}</h1>
      <p className="hint">{t("nearbyHint")}</p>
      {(!geo.coords || geo.error) && (
        <div className="panel mt-5">
          <p>{t(geo.error || "findingLocation")}</p>
          {geo.error && (
            <button className="button secondary mt-3" onClick={geo.retry}>
              {t("retry")}
            </button>
          )}
        </div>
      )}
      {(error || feed.error) && (
        <p className="error mt-4" role="alert">
          {t(error || feed.error)}
        </p>
      )}
      <div className="mt-6 space-y-6">
        {active.map((r) => (
          <RequestPanel
            key={r.id}
            request={r}
            coords={geo.coords}
            refresh={feed.refresh}
          />
        ))}
      </div>
      {!active.length && geo.coords && (
        <div className="mt-6">
          <LocationMap
            lat={geo.coords.lat}
            lng={geo.coords.lng}
            radius={5000}
            title={t("nearby")}
            points={tasks.map((task) => ({
              ...task,
              label: t(task.category),
              urgency: task.urgency_level,
            }))}
          />
        </div>
      )}
      {!active.length && geo.coords && (
        <section className="mt-6">
          {tasks.length ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {tasks.map((task, i) => (
                <li
                  id={"request-" + task.id}
                  key={task.id}
                  className="panel scroll-mt-4"
                >
                  <p className="text-sm font-semibold text-muted">
                    #{i + 1} · {t("approx")}{" "}
                    {(task.distanceMeters / 1000).toFixed(1)} {t("km")}
                  </p>
                  <h2 className="mt-3">{t(task.category)}</h2>
                  <p className="hint">
                    {t(
                      task.source === "fallback"
                        ? "unassessed"
                        : task.urgency_level,
                    )}
                  </p>
                  <button
                    className="button mt-4 w-full"
                    disabled={!!accepting}
                    onClick={async () => {
                      setAccepting(task.id);
                      setError("");
                      try {
                        await post("/api/volunteer/accept", {
                          id: task.id,
                          ...geo.coords,
                        });
                        setTasks((items) =>
                          items.filter((x) => x.id !== task.id),
                        );
                        await feed.refresh();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setAccepting("");
                      }
                    }}
                  >
                    {t(accepting === task.id ? "accepting" : "accept")}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="panel">
              <h2>{t("noTasks")}</h2>
              <p className="hint">{t("autoRefresh")}</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
