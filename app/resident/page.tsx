"use client";

import { categoryLabel } from "@/lib/labels";
import { useRoleProfile } from "@/lib/profile";
import type { DispatchAction, RequestCategory, RequestStatus, UrgencyLevel } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";

const EMERGENCY_NUMBER = process.env.NEXT_PUBLIC_EMERGENCY_NUMBER || "999";

type LiveRequest = {
  id: string;
  status: RequestStatus;
  dispatch_action: DispatchAction;
  summary: string;
  urgency_level: UrgencyLevel;
  category: RequestCategory;
  source?: "gemini" | "fallback";
};

type GeoState = "loading" | "ready" | "error";

export default function ResidentPage() {
  const router = useRouter();
  const { ready, profile } = useRoleProfile("resident");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("loading");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveRequest | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingRef = useRef(false);
  const holdActiveRef = useRef(false);
  const ignoreClickRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const recordGenerationRef = useRef(0);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const message = "This browser has no location service. Porchline needs it so volunteers know how far away you are.";
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
        setGeoError(null);
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        const message = denied
          ? "Location permission was denied. Allow location so volunteers within range can find you."
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
      const message = "This browser has no location service. Porchline needs it so volunteers know how far away you are.";
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
        setGeoError(null);
      },
      (error) => {
        if (cancelled) return;
        const denied = error.code === error.PERMISSION_DENIED;
        const message = denied
          ? "Location permission was denied. Allow location so volunteers within range can find you."
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
    if (!recording) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!live?.id) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const response = await fetch(`/api/request/status?id=${encodeURIComponent(live.id)}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as LiveRequest | { error?: string } | null;
        if (!response.ok || !payload || !("status" in payload)) {
          if (!cancelled) setPollError("Could not refresh this request. Still trying…");
          return;
        }
        if (!cancelled) {
          setPollError(null);
          setLive((current) => ({ ...payload, source: current?.source }));
        }
      } catch {
        if (!cancelled) setPollError("Could not refresh this request. Still trying…");
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [live?.id]);

  function clearHoldTimer() {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  async function startRecording() {
    if (recordingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "This browser cannot record audio. Attach a photo instead.";
      window.alert(message);
      setMicError(message);
      return;
    }
    const generation = ++recordGenerationRef.current;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!stream || generation !== recordGenerationRef.current) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }
      const mediaStream = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob.size > 0 ? blob : null);
        mediaStream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === mediaStream) streamRef.current = null;
      };
      streamRef.current = mediaStream;
      recorderRef.current = recorder;
      recorder.start();
      recordingRef.current = true;
      setSeconds(0);
      setRecording(true);
      setMicError(null);
      setAudioBlob(null);
      stream = null;
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      const denied =
        error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
      const message = denied
        ? "Microphone permission was denied. Allow the mic to record, or attach a photo of what you need."
        : "The microphone could not start. Attach a photo, or try the recorder again.";
      window.alert(message);
      setMicError(message);
    }
  }

  function stopRecording() {
    recordGenerationRef.current += 1;
    const recorder = recorderRef.current;
    recordingRef.current = false;
    setRecording(false);
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    holdActiveRef.current = false;
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      holdActiveRef.current = true;
      ignoreClickRef.current = true;
      void startRecording();
    }, 280);
  }

  function onPointerUp() {
    clearHoldTimer();
    if (holdActiveRef.current) {
      holdActiveRef.current = false;
      stopRecording();
    }
  }

  function onRecordClick() {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      return;
    }
    if (recordingRef.current) stopRecording();
    else void startRecording();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    if (!coords) {
      const message = geoError || "Location is not ready yet. Allow location, then send your request.";
      window.alert(message);
      setSubmitError(message);
      return;
    }
    if (!audioBlob && !photo) {
      const message = "Record a voice note or add a photo so people know what you need.";
      window.alert(message);
      setSubmitError(message);
      return;
    }

    const body = new FormData();
    body.set("lat", String(coords.lat));
    body.set("lng", String(coords.lng));
    body.set("residentName", profile.name);
    body.set("residentPhone", profile.phone);
    if (audioBlob) body.set("audio", audioBlob, "distress.webm");
    if (photo) body.set("image", photo);

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/triage", { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as (LiveRequest & { error?: string }) | null;
      if (!response.ok || !payload?.id || !payload.dispatch_action) {
        setSubmitError(payload?.error || "The request did not go through. Your note is still here — try sending again.");
        return;
      }
      setLive({
        id: payload.id,
        status: payload.status || "PENDING",
        dispatch_action: payload.dispatch_action,
        summary: payload.summary,
        urgency_level: payload.urgency_level,
        category: payload.category,
        source: payload.source,
      });
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setSubmitError("Could not reach Porchline. Your note is still on this page — try sending again.");
    } finally {
      setSubmitting(false);
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

  const emergency = live?.dispatch_action.startsWith("EMERGENCY") ?? false;
  const neighbourhood = live?.dispatch_action === "NEIGHBORHOOD_VOLUNTEER";

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-10">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Resident</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Tell neighbours what you need</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">
          {profile.name}, a voice note is enough. Add a photo if the road is blocked, a roof is open, or someone is hurt.
        </p>

        <div className="mt-6 space-y-4">
          {geoState === "loading" ? (
            <p role="status" className="rounded-2xl border border-line bg-surface px-4 py-3 text-base">
              Finding your location…
            </p>
          ) : null}
          {geoState === "ready" && coords ? (
            <p role="status" className="rounded-2xl border border-line bg-surface px-4 py-3 text-base">
              Location locked at {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}. Volunteers will see how far away you are.
            </p>
          ) : null}
          {geoError ? (
            <div role="alert" className="rounded-2xl border-2 border-danger bg-white px-4 py-3 text-base text-danger">
              <p>{geoError}</p>
              <button
                type="button"
                onClick={requestLocation}
                className="mt-3 inline-flex min-h-12 items-center rounded-2xl bg-danger px-4 font-semibold text-white"
              >
                Try location again
              </button>
            </div>
          ) : null}

          <div ref={resultRef}>
            {live && emergency ? (
              <section role="alert" className="rounded-3xl bg-danger p-5 text-white sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">Emergency</p>
                <h2 className="mt-2 text-2xl font-semibold">This needs emergency services.</h2>
                <p className="mt-3 text-lg leading-7">{live.summary}</p>
                <a
                  href={`tel:${EMERGENCY_NUMBER}`}
                  className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-white px-5 text-lg font-semibold text-danger"
                >
                  📞 Call Emergency ({EMERGENCY_NUMBER})
                </a>
              </section>
            ) : null}
            {live && neighbourhood ? (
              <section role="status" className="rounded-3xl bg-ok p-5 text-white sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">Neighbours</p>
                <h2 className="mt-2 text-2xl font-semibold">Broadcasted to local volunteers within 500m</h2>
                <p className="mt-3 text-lg leading-7">{live.summary}</p>
                {live.status === "ACCEPTED" ? (
                  <p className="mt-4 text-xl font-semibold">🟢 Volunteer en route!</p>
                ) : (
                  <p className="mt-4 text-base leading-7">Waiting for someone nearby to accept. This page checks every few seconds.</p>
                )}
              </section>
            ) : null}
            {live?.source === "fallback" ? (
              <p className="mt-3 rounded-2xl border border-line bg-surface px-4 py-3 text-base" role="status">
                Automatic reading was unavailable, so this was marked urgent and sent to neighbours.
              </p>
            ) : null}
            {pollError ? (
              <p role="alert" className="mt-3 text-base font-medium text-danger">
                {pollError}
              </p>
            ) : null}
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <button
              type="button"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={onRecordClick}
              onContextMenu={(event) => event.preventDefault()}
              className={`flex min-h-14 w-full touch-none items-center justify-center gap-3 rounded-2xl border-2 border-foreground px-4 text-lg font-semibold select-none ${
                recording ? "bg-danger text-white" : "bg-white"
              }`}
            >
              {recording ? <span className="rec-dot inline-block h-3 w-3 rounded-full bg-white" aria-hidden /> : null}
              {recording
                ? `Recording ${seconds}s — release or tap to stop`
                : audioBlob
                  ? "Hold or tap to record again"
                  : "Hold or tap to record a voice note"}
            </button>
            <p className="mt-2 text-sm text-muted" aria-live="polite">
              {recording
                ? "Listening. Speak what you need, who is with you, and whether anyone is hurt."
                : audioBlob
                  ? `Voice note ready (${Math.max(1, Math.round(audioBlob.size / 1024))} KB).`
                  : "Hold the button, or tap once to start and tap again to stop."}
            </p>
            {micError ? (
              <p role="alert" className="mt-2 text-base font-medium text-danger">
                {micError}
              </p>
            ) : null}
          </div>

          <div>
            <label className="flex min-h-14 w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-foreground bg-white px-4 text-lg font-semibold">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              />
              {photo ? "Change photo" : "Take or upload a photo"}
            </label>
            <p className="mt-2 text-sm text-muted">{photo ? photo.name : "Optional if you already recorded a voice note."}</p>
          </div>

          {submitError ? (
            <p role="alert" className="rounded-2xl border-2 border-danger bg-white px-4 py-3 text-base font-medium text-danger">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-foreground px-5 text-lg font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Sending your note…" : "Send to neighbours"}
          </button>
          {live ? (
            <p className="text-sm text-muted">
              Classed as {categoryLabel(live.category).toLowerCase()}, {live.urgency_level.toLowerCase()} urgency.
            </p>
          ) : (
            <p className="text-sm text-muted">Nothing sent yet. Your note stays on this phone until you send it.</p>
          )}
        </form>
      </section>

      <aside className="h-fit rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold">While you wait</h2>
        <ul className="mt-3 space-y-3 text-base leading-7 text-muted">
          <li>Stay where you are if it is safe, and keep your phone on.</li>
          <li>If breathing, bleeding, or a collapse gets worse, call {EMERGENCY_NUMBER} yourself. Do not wait for a volunteer.</li>
          <li>A green card means neighbours within 500 metres were asked. A red card means call emergency services.</li>
        </ul>
      </aside>
    </main>
  );
}
