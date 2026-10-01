"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api, useApp } from "./providers";
import type { RequestView } from "@/lib/types";
function Microphone() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="25"
      height="25"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
    </svg>
  );
}
export default function RequestForm({
  coords,
  onSent,
  onLocate,
  location,
}: {
  coords: { lat: number; lng: number } | null;
  onSent: (r: RequestView) => Promise<void>;
  onLocate: () => Promise<{ lat: number; lng: number } | null>;
  location: React.ReactNode;
}) {
  const { t, locale } = useApp();
  const [text, setText] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [photoUrl, setPhotoUrl] = useState(""),
    [audio, setAudio] = useState<Blob | null>(null),
    [audioUrl, setAudioUrl] = useState(""),
    [recording, setRecording] = useState(false),
    [starting, setStarting] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0),
    requestLock = useRef(false),
    recLock = useRef(false);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    const id = setTimeout(() => setPhotoUrl(url), 0);
    return () => {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    };
  }, [photo]);
  useEffect(() => {
    if (!audio) return;
    const url = URL.createObjectURL(audio);
    const id = setTimeout(() => setAudioUrl(url), 0);
    return () => {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    };
  }, [audio]);
  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function toggleRecording() {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
      return;
    }
    if (recLock.current) return;
    recLock.current = true;
    const token = ++generation.current;
    setStarting(true);
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw Error();
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"].find(
        (x) => MediaRecorder.isTypeSupported(x),
      );
      const r = new MediaRecorder(media, mime ? { mimeType: mime } : undefined),
        chunks: Blob[] = [];
      recorder.current = r;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        media.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
        recLock.current = false;
        if (token !== generation.current) return;
        setRecording(false);
        const blob = new Blob(chunks, { type: r.mimeType });
        if (!blob.size) setError("micError");
        else if (blob.size > 8 * 1024 * 1024) setError("fileTooLarge");
        else setAudio(blob);
      };
      r.onerror = () => {
        media.getTracks().forEach((t) => t.stop());
        recLock.current = false;
        if (token === generation.current) {
          setRecording(false);
          setError("micError");
        }
      };
      r.start();
      setAudio(null);
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 60000);
    } catch {
      stream.current?.getTracks().forEach((t) => t.stop());
      recLock.current = false;
      setError("micError");
    } finally {
      setStarting(false);
    }
  }
  return (
    <form
      className="simple-request"
      onSubmit={async (e) => {
        e.preventDefault();
        if (requestLock.current) return;
        if (recording || starting) {
          setError("stopRecordingFirst");
          return;
        }
        if (!text.trim() && !audio?.size) {
          setError("emptyRequest");
          return;
        }
        requestLock.current = true;
        setBusy(true);
        setError("");
        try {
          const point = coords || await onLocate();
          if (!point) {
            setError("selectLocationToSend");
            return;
          }
          const body = new FormData();
          body.set("lat", String(point.lat));
          body.set("lng", String(point.lng));
          body.set("text", text);
          body.set("locale", locale);
          if (photo) body.set("image", photo);
          if (audio) body.set("audio", audio, "voice-note");
          const saved = await api<RequestView>("/api/triage", {
            method: "POST",
            body,
          });
          await onSent(saved);
          setText("");
          setPhoto(null);
          setAudio(null);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          requestLock.current = false;
          setBusy(false);
        }
      }}
    >
      <div className="simple-request-content">
        <label className="field">
          <span className="sr-only">{t("description")}</span>
          <textarea
            rows={3}
            maxLength={4000}
            placeholder={t("describeTitle")}
            aria-label={t("description")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
        </label>
        <div className="request-input-tools">
          <input
            ref={file}
            hidden
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={t("addPhoto")}
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 8 * 1024 * 1024) {
                setError("fileTooLarge");
                return;
              }
              if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
                setError("invalidImage");
                return;
              }
              setPhotoUrl("");
              setPhoto(f);
              setError("");
            }}
          />
          <button
            className="attachment-plus"
            type="button"
            onClick={() => file.current?.click()}
            disabled={busy}
            aria-label={t("addPhoto")}
            title={t("addPhoto")}
          >
            ＋
          </button>
          <button
            className={"voice-control " + (recording ? "is-recording" : "")}
            type="button"
            disabled={busy || starting}
            onClick={() => void toggleRecording()}
            aria-label={t(recording ? "tapStop" : "tapSpeak")}
            aria-pressed={recording}
          >
            <Microphone />
            <span>
              {t(starting ? "loading" : recording ? "tapStop" : "tapSpeak")}
            </span>
          </button>
        </div>
        {recording && (
          <p role="status" className="text-sm">
            {t("recording")} · {t("recordLimit")}
          </p>
        )}
        {photo && (
          <div className="selected-media">
            {photoUrl && (
              <Image
                unoptimized
                src={photoUrl}
                width={100}
                height={70}
                alt={t("photoPreview")}
              />
            )}
            <span>{t("photoTab")}</span>
            <button
              type="button"
              onClick={() => setPhoto(null)}
              aria-label={t("removePhoto")}
            >
              ×
            </button>
          </div>
        )}
        {audio && (
          <div className="selected-media">
            <audio controls src={audioUrl} />
            <button
              type="button"
              onClick={() => setAudio(null)}
              aria-label={t("removeAudio")}
            >
              ×
            </button>
          </div>
        )}
        {location}
      </div>
      {error && (
        <p className="error text-sm" role="alert">
          {t(error)}
        </p>
      )}
      <button
        className="button w-full"
        disabled={busy || recording || starting}
      >
        {t(busy ? "sending" : "sendRequest")}
      </button>
    </form>
  );
}
