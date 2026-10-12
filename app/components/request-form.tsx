"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CLARIFY_LIMIT,
  CLARIFY_PROMPTS,
  clarifiedText,
} from "@/lib/clarify";
import { IMAGE_ACCEPT, isAcceptedImage } from "@/lib/image-accept";
import { spokenToDeepgram } from "@/lib/speech";
import { api, useApp } from "./providers";
import type { RequestView } from "@/lib/types";

function defaultSpoken(locale: string): "en" | "zh" | "yue" {
  if (locale === "zh-Hant") return "yue";
  if (locale === "zh-Hans") return "zh";
  return "en";
}
function Microphone() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="36"
      height="36"
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
  const { t, locale, user } = useApp();
  const [text, setText] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [photoUrl, setPhotoUrl] = useState(""),
    [audio, setAudio] = useState<Blob | null>(null),
    [audioUrl, setAudioUrl] = useState(""),
    [recording, setRecording] = useState(false),
    [starting, setStarting] = useState(false),
    [transcribing, setTranscribing] = useState(false),
    [transcriptNote, setTranscriptNote] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [asking, setAsking] = useState(false),
    [answers, setAnswers] = useState<string[]>([]),
    [draft, setDraft] = useState(""),
    [clarifyPoint, setClarifyPoint] = useState<{
      lat: number;
      lng: number;
    } | null>(null),
    [spoken, setSpoken] = useState<"en" | "zh" | "yue">(defaultSpoken(locale));
  const spokenTouched = useRef(false);
  const lastTranscript = useRef("");
  const file = useRef<HTMLInputElement>(null),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0),
    requestLock = useRef(false),
    recLock = useRef(false);
  useEffect(() => {
    if (spokenTouched.current) return;
    setSpoken(defaultSpoken(locale));
  }, [locale]);
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
        else {
          setAudio(blob);
          void applyTranscript(blob);
        }
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
  function resetDraft() {
    setText("");
    setPhoto(null);
    setAudio(null);
    setTranscriptNote(false);
    lastTranscript.current = "";
    setAsking(false);
    setAnswers([]);
    setDraft("");
    setClarifyPoint(null);
  }
  async function deliver(nextAnswers: string[], clarify: boolean) {
    if (requestLock.current) return;
    if (recording || starting || transcribing) {
      setError(transcribing ? "transcribing" : "stopRecordingFirst");
      return;
    }
    const message = clarifiedText(text, nextAnswers);
    if (!message) {
      setError("emptyRequest");
      return;
    }
    requestLock.current = true;
    setBusy(true);
    setError("");
    try {
      const point = clarifyPoint || coords || (await onLocate());
      if (!point) {
        setError("locateToSend");
        return;
      }
      const body = new FormData();
      body.set("lat", String(point.lat));
      body.set("lng", String(point.lng));
      body.set("text", message);
      body.set("locale", locale);
      body.set("language", spokenToDeepgram(spoken, locale));
      if (clarify) body.set("clarify", "1");
      if (photo) body.set("image", photo);
      if (audio) body.set("audio", audio, "voice-note");
      const saved = await api<RequestView | { needsClarification: true }>(
        "/api/triage",
        { method: "POST", body },
      );
      if (
        clarify &&
        "needsClarification" in saved &&
        saved.needsClarification &&
        nextAnswers.length < CLARIFY_LIMIT
      ) {
        setClarifyPoint(point);
        setAnswers(nextAnswers);
        setDraft("");
        setAsking(true);
        return;
      }
      if (!("id" in saved)) return;
      await onSent(saved);
      resetDraft();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }
  async function applyTranscript(blob: Blob) {
    if (!user?.privacy.allowAI) {
      setTranscriptNote(false);
      setError("speechNeedsConsent");
      return;
    }
    setTranscribing(true);
    setError("");
    setTranscriptNote(false);
    try {
      const body = new FormData();
      body.set("audio", blob, "voice-note");
      body.set("language", spokenToDeepgram(spoken, locale));
      const result = await api<{ transcript: string }>("/api/speech", {
        method: "POST",
        body,
      });
      const transcript = result.transcript.trim();
      if (!transcript) throw new Error("audioUnavailable");
      setText((current) => {
        const previous = lastTranscript.current;
        if (!current.trim() || current === previous) return transcript;
        if (previous && current.endsWith(previous))
          return (current.slice(0, -previous.length) + transcript).trim();
        return (current.trim() + "\n" + transcript).slice(0, 4000);
      });
      lastTranscript.current = transcript;
      setTranscriptNote(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTranscribing(false);
    }
  }
  return (
    <form
      className={"simple-request" + (asking ? " is-clarifying" : "")}
      onSubmit={(e) => {
        e.preventDefault();
        void deliver(
          asking ? [...answers, ...(draft.trim() ? [draft.trim()] : [])] : [],
          !asking,
        );
      }}
    >
      <div className="simple-request-content">
        <label className="field">
          <span className="sr-only">{t("description")}</span>
          <textarea
            rows={asking ? 2 : 6}
            maxLength={4000}
            placeholder={t("describeTitle")}
            aria-label={t("description")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy || transcribing}
          />
        </label>
        <div
          className="segmented spoken-language"
          role="radiogroup"
          aria-label={t("speechLanguage")}
        >
          {(
            [
              ["en", "english"],
              ["zh", "mandarin"],
              ["yue", "cantonese"],
            ] as const
          ).map(([value, key]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={spoken === value}
              disabled={busy || recording || transcribing}
              onClick={() => {
                spokenTouched.current = true;
                setSpoken(value);
              }}
            >
              {t(key)}
            </button>
          ))}
        </div>
        <div className="request-input-tools">
          <input
            ref={file}
            hidden
            className="sr-only"
            type="file"
            accept={IMAGE_ACCEPT}
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
              if (!isAcceptedImage(f)) {
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
            <svg aria-hidden viewBox="0 0 32 32" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="23" height="22" rx="4" />
              <circle cx="10" cy="12" r="2" />
              <path d="m4 23 7-7 5 5 4-4 6 6M25 2v8m-4-4h8" />
            </svg>
            <span>{t("addPhoto")}</span>
          </button>
          <button
            className={"voice-control " + (recording ? "is-recording" : "")}
            type="button"
            disabled={busy || starting || transcribing}
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
        {transcribing && (
          <p role="status" className="text-sm">
            {t("transcribing")}
          </p>
        )}
        {transcriptNote && !transcribing && (
          <p role="status" className="text-sm">
            {t("transcriptReady")}
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
            {audioUrl && <audio controls src={audioUrl} />}
            <button
              type="button"
              onClick={() => {
                setAudio(null);
              }}
              aria-label={t("removeAudio")}
            >
              ×
            </button>
          </div>
        )}
        {location}
        {asking && (
          <section
            className="clarify-chat"
            aria-label={t("clarifyLog")}
            ref={(node) => node?.scrollIntoView({ block: "nearest" })}
          >
            <div className="clarify-log" role="log">
              {answers.map((answer, index) => (
                <div key={CLARIFY_PROMPTS[index]}>
                  <p className="bubble received">{t(CLARIFY_PROMPTS[index])}</p>
                  <p className="bubble sent">{answer}</p>
                </div>
              ))}
              {answers.length < CLARIFY_LIMIT && (
                <p className="bubble received">
                  {t(CLARIFY_PROMPTS[answers.length])}
                </p>
              )}
            </div>
            <label className="field">
              <span className="sr-only">{t("clarifyAnswer")}</span>
              <textarea
                rows={2}
                maxLength={4000}
                placeholder={t("clarifyAnswer")}
                aria-label={t("clarifyAnswer")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={busy}
              />
            </label>
            <button
              className="button w-full"
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => {
                const answer = draft.trim();
                if (!answer) return;
                const next = [...answers, answer];
                void deliver(next, next.length < CLARIFY_LIMIT);
              }}
            >
              {t(busy ? "clarifyChecking" : "clarifySend")}
            </button>
          </section>
        )}
      </div>
      {error && (
        <p className="error text-sm" role="alert">
          {t(error)}
        </p>
      )}
      <button
        className="button w-full"
        disabled={busy || recording || starting || transcribing}
      >
        {t(
          busy
            ? asking
              ? "clarifyChecking"
              : "sending"
            : transcribing
              ? "transcribing"
              : asking
                ? "clarifySkip"
                : "sendRequest",
        )}
      </button>
    </form>
  );
}
