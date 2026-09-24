"use client";

import { categoryLabel, dispatchLabel, formatAge, formatDistance, urgencyLabel } from "@/lib/labels";
import { useRoleProfile } from "@/lib/profile";
import type { DispatchAction, HelpRequest, RequestCategory, UrgencyLevel } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type VolunteerTask = {
  id: string;
  residentName: string;
  lat: number;
  lng: number;
  urgency_level: UrgencyLevel;
  category: RequestCategory;
  summary: string;
  dispatch_action: DispatchAction;
  status: "PENDING" | "ACCEPTED";
  createdAt: string;
  mediaNote?: string;
  distanceMeters: number;
};

const URGENCY_STYLE: Record<UrgencyLevel, string> = {
  HIGH: "bg-danger text-white",
  MEDIUM: "bg-[#9a3412] text-white",
  LOW: "bg-[#44403c] text-white",
};

export default function VolunteerPage() {
  const router = useRouter();
  const { ready, profile } = useRoleProfile("volunteer");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoState, setGeoState] = useState<"loading" | "ready" | "error">("loading");
  const [tasks, setTasks] = useState<VolunteerTask[] | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<HelpRequest | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const message = "This browser has no location service. Volunteers only see requests within 5 km.";
      window.alert(message);
      setGeoError(message);
      setGeoState("error");
      return;
    }
    setGeoState("loading");
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGeoState("ready");
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        const message = denied
          ? "Location permission was denied. Volunteers only see requests within 5 km of where they are."
          : "Could not read your location. Turn location services on and try again.";
        window.alert(message);
        setGeoError(message);
        setGeoState("error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 20000 },
    );
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!profile) router.replace("/login");
  }, [ready, profile, router]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    if (!navigator.geolocation) {
      const message = "This browser has no location service. Volunteers only see requests within 5 km.";
      window.alert(message);
      queueMicrotask(() => {
        if (cancelled) return;
        setGeoError(message);
        setGeoState("error");
      });
      return () => {
        cancelled = true;
      };
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGeoState("ready");
      },
      (error) => {
        if (cancelled) return;
        const denied = error.code === error.PERMISSION_DENIED;
        const message = denied
          ? "Location permission was denied. Volunteers only see requests within 5 km of where they are."
          : "Could not read your location. Turn location services on and try again.";
        window.alert(message);
        setGeoError(message);
        setGeoState("error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 20000 },
    );
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const response = await fetch(
          `/api/volunteer/tasks?lat=${encodeURIComponent(coords.lat)}&lng=${encodeURIComponent(coords.lng)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => null)) as { tasks?: VolunteerTask[]; error?: string } | null;
        if (!response.ok || !payload?.tasks) {
          if (!cancelled) setTasksError(payload?.error || "Could not load nearby requests.");
          return;
        }
        if (!cancelled) {
          setTasks(payload.tasks);
          setTasksError(null);
        }
      } catch {
        if (!cancelled) setTasksError("Could not load nearby requests. Still trying…");
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [coords]);

  async function acceptTask(id: string) {
    setAcceptingId(id);
    setAcceptError(null);
    try {
      const response = await fetch("/api/volunteer/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json().catch(() => null)) as HelpRequest | { error?: string } | null;
      if (!response.ok || !payload || !("status" in payload)) {
        setAcceptError(
          payload && "error" in payload && payload.error
            ? payload.error
            : "Could not accept that request. It may already be gone.",
        );
        return;
      }
      setAccepted(payload);
      setTasks((current) => current?.filter((task) => task.id !== id) ?? current);
    } catch {
      setAcceptError("Could not reach Porchline. Try accepting again.");
    } finally {
      setAcceptingId(null);
    }
  }

  if (!ready || !profile) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-lg" role="status">
          Opening your sign-in…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Volunteer</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Calls near you</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">
            {profile.name}, open requests inside 5 km show up here, most urgent first. Accept one only if you can go.
          </p>
        </div>
        <aside className="h-fit rounded-3xl border border-line bg-surface p-5">
          {geoState === "loading" ? <p role="status">Finding your location…</p> : null}
          {geoState === "ready" && coords ? (
            <p role="status">
              You are at {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}. The list refreshes every few seconds.
            </p>
          ) : null}
          {geoError ? (
            <div role="alert">
              <p className="text-danger">{geoError}</p>
              <button
                type="button"
                onClick={requestLocation}
                className="mt-3 inline-flex min-h-12 items-center rounded-2xl bg-foreground px-4 font-semibold text-white"
              >
                Try location again
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      {accepted ? (
        <section role="status" className="mt-6 rounded-3xl bg-ok p-5 text-white sm:p-6">
          <h2 className="text-2xl font-semibold">You took this call.</h2>
          <p className="mt-3 text-lg leading-7">{accepted.summary}</p>
          <p className="mt-3 text-base">
            Call {accepted.residentName} on{" "}
            <a href={`tel:${accepted.residentPhone}`} className="font-semibold underline">
              {accepted.residentPhone}
            </a>{" "}
            and head over if it is safe.
          </p>
        </section>
      ) : null}

      {acceptError ? (
        <p role="alert" className="mt-4 rounded-2xl border-2 border-danger bg-white px-4 py-3 font-medium text-danger">
          {acceptError}
        </p>
      ) : null}
      {tasksError ? (
        <p role="alert" className="mt-4 rounded-2xl border-2 border-danger bg-white px-4 py-3 font-medium text-danger">
          {tasksError}
        </p>
      ) : null}

      <section className="mt-6" aria-live="polite">
        {geoState === "error" && !coords ? (
          <p className="rounded-3xl border border-line bg-surface px-5 py-8 text-lg">
            Location is blocked, so there is no list to show yet.
          </p>
        ) : null}
        {coords && tasks === null && !tasksError ? (
          <p className="rounded-3xl border border-line bg-surface px-5 py-8 text-lg" role="status">
            Checking who needs help nearby…
          </p>
        ) : null}
        {coords && tasks && tasks.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface px-5 py-8">
            <h2 className="text-2xl font-semibold">No open requests within 5 km</h2>
            <p className="mt-2 max-w-xl text-lg leading-8 text-muted">
              The street is quiet from where you are standing. Leave this page open — new calls appear on their own.
            </p>
          </div>
        ) : null}
        {tasks && tasks.length > 0 ? (
          <ul className="grid gap-4 lg:grid-cols-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-col rounded-3xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-sm font-semibold ${URGENCY_STYLE[task.urgency_level]}`}>
                    {urgencyLabel(task.urgency_level)}
                  </span>
                  <span className="text-sm font-semibold">{formatDistance(task.distanceMeters)}</span>
                  <span className="text-sm text-muted">{formatAge(task.createdAt)}</span>
                </div>
                <p className="mt-4 text-lg leading-7">{task.summary}</p>
                <p className="mt-2 text-sm text-muted">
                  {categoryLabel(task.category)} · {dispatchLabel(task.dispatch_action)}
                </p>
                <button
                  type="button"
                  onClick={() => void acceptTask(task.id)}
                  disabled={acceptingId === task.id}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-foreground px-4 text-base font-semibold text-white disabled:opacity-60"
                >
                  {acceptingId === task.id ? "Accepting…" : "Accept Task & Respond"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
