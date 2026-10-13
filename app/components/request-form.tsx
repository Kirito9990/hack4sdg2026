"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CLARIFY_LIMIT,
  CLARIFY_PROMPT,
  clarifiedText,
  nextClarifySlot,
  requestSummary,
  type ClarifySlot,
  type ClarifyTurn,
} from "@/lib/clarify";
import { IMAGE_ACCEPT, isAcceptedImage } from "@/lib/image-accept";
import { messageVoiceLang, transcriptionLanguage } from "@/lib/speech";
import { recordingToWav } from "@/lib/wav";
import { api, useApp } from "./providers";
import type { RequestView } from "@/lib/types";

function speakMessage(message: string, locale: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = messageVoiceLang(locale);
  const wanted = utterance.lang.toLowerCase();
  const voices = synth.getVoices();
  utterance.voice =
    voices.find((item) => item.lang.toLowerCase().replace("_", "-") === wanted) ||
    voices.find((item) => item.lang.toLowerCase().startsWith(wanted)) ||
    voices.find((item) =>
      item.lang.toLowerCase().startsWith(wanted.slice(0, 2)),
    ) ||
    null;
  synth.speak(utterance);
}
function mergeTranscript(current: string, previous: string, transcript: string) {
  if (!current.trim() || current === previous) return transcript;
  if (previous && current.endsWith(previous))
    return (current.slice(0, -previous.length) + transcript).trim();
  return (current.trim() + "\n" + transcript).slice(0, 4000);
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
function Speaker() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
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
    [turns, setTurns] = useState<ClarifyTurn[]>([]),
    [pending, setPending] = useState<{ slot: ClarifySlot; question: string } | null>(null),
    [summary, setSummary] = useState<string | null>(null),
    [draft, setDraft] = useState(""),
    [voiceTarget, setVoiceTarget] = useState<"request" | "answer">("request"),
    [clarifyPoint, setClarifyPoint] = useState<{
      lat: number;
      lng: number;
    } | null>(null);
  const lastTranscript = useRef("");
  const lastAnswerTranscript = useRef("");
  const recordTarget = useRef<"request" | "answer">("request");
  const file = useRef<HTMLInputElement>(null),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0),
    requestLock = useRef(false),
    recLock = useRef(false);
  useEffect(() => {
    if (!asking || !pending) return;
    speakMessage(pending.question, locale);
    return () => window.speechSynthesis?.cancel();
  }, [asking, pending, locale]);
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
      window.speechSynthesis?.cancel();
    },
    [],
  );
  async function toggleRecording(target: "request" | "answer" = "request") {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
      return;
    }
    if (recLock.current) return;
    recordTarget.current = target;
    setVoiceTarget(target);
    window.speechSynthesis?.cancel();
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
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        void finishRecording(blob, token);
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
      if (target === "request") setAudio(null);
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
  async function finishRecording(blob: Blob, token: number) {
    if (!blob.size) {
      setError("micError");
      return;
    }
    if (blob.size > 8 * 1024 * 1024) {
      setError("fileTooLarge");
      return;
    }
    const wav = await recordingToWav(blob);
    if (token !== generation.current) return;
    if (wav.size > 8 * 1024 * 1024) {
      setError("fileTooLarge");
      return;
    }
    const target = recordTarget.current;
    if (target === "request") setAudio(wav);
    void applyTranscript(wav, target);
  }
  function resetDraft() {
    setText("");
    setPhoto(null);
    setAudio(null);
    setTranscriptNote(false);
    lastTranscript.current = "";
    setAsking(false);
    setTurns([]);
    setPending(null);
    setSummary(null);
    setDraft("");
    lastAnswerTranscript.current = "";
    setClarifyPoint(null);
  }
  async function deliver(nextTurns: ClarifyTurn[], clarify: boolean, confirmed?: string) {
    if (requestLock.current) return;
    if (recording || starting || transcribing) {
      setError(transcribing ? "transcribing" : "stopRecordingFirst");
      return;
    }
    const message =
      confirmed !== undefined
        ? confirmed.trim()
        : clarifiedText(
            text,
            nextTurns.map((turn) => turn.answer),
          );
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
      body.set("language", transcriptionLanguage(locale));
      if (clarify) body.set("clarify", "1");
      if (nextTurns.length) body.set("asked", nextTurns.map((turn) => turn.slot).join(","));
      if (photo) body.set("image", photo);
      if (audio) body.set("audio", audio, "voice-note");
      const saved = await api<
        | RequestView
        | { needsClarification?: true; needsConfirmation?: true; slot?: string; question?: string }
      >(
        "/api/triage",
        { method: "POST", body },
      );
      if (clarify && saved && "needsConfirmation" in saved && saved.needsConfirmation) {
        setClarifyPoint(point);
        setTurns(nextTurns);
        setPending(null);
        setSummary(requestSummary(text, nextTurns.map((turn) => turn.answer)));
        setDraft("");
        setAsking(true);
        return;
      }
      if (clarify && saved && "needsClarification" in saved && saved.needsClarification) {
        const localSlot =
          nextTurns.length < CLARIFY_LIMIT
            ? nextClarifySlot(
                message,
                nextTurns.map((turn) => turn.slot),
              )
            : null;
        const slot =
          saved.slot === "need" || saved.slot === "detail" || saved.slot === "time"
            ? saved.slot
            : localSlot;
        if (slot && !nextTurns.some((turn) => turn.slot === slot) && nextTurns.length < CLARIFY_LIMIT) {
          setClarifyPoint(point);
          setTurns(nextTurns);
          setSummary(null);
          setPending({
            slot,
            question: saved.question?.trim() || t(CLARIFY_PROMPT[slot]),
          });
          setDraft("");
          lastAnswerTranscript.current = "";
          setAsking(true);
          return;
        }
        setClarifyPoint(point);
        setTurns(nextTurns);
        setPending(null);
        setSummary(requestSummary(text, nextTurns.map((turn) => turn.answer)));
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
  async function applyTranscript(blob: Blob, target: "request" | "answer") {
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
      body.set("locale", locale);
      body.set("language", transcriptionLanguage(locale));
      const result = await api<{ transcript: string }>("/api/speech", {
        method: "POST",
        body,
      });
      const transcript = result.transcript.trim();
      if (!transcript) throw new Error("audioUnavailable");
      if (target === "answer") {
        setDraft((current) =>
          mergeTranscript(current, lastAnswerTranscript.current, transcript),
        );
        lastAnswerTranscript.current = transcript;
      } else {
        setText((current) =>
          mergeTranscript(current, lastTranscript.current, transcript),
        );
        lastTranscript.current = transcript;
      }
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
        if (summary !== null) {
          void deliver([], false, summary);
          return;
        }
        const answer = draft.trim();
        void deliver(
          asking
            ? answer && pending
              ? [...turns, { slot: pending.slot, question: pending.question, answer }]
              : turns
            : [],
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
            disabled={busy || transcribing || summary !== null}
          />
        </label>
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
            className={
              "voice-control " +
              (recording && voiceTarget === "request" ? "is-recording" : "")
            }
            type="button"
            disabled={
              busy ||
              starting ||
              transcribing ||
              (recording && voiceTarget !== "request")
            }
            onClick={() => void toggleRecording("request")}
            aria-label={t(
              recording && voiceTarget === "request" ? "tapStop" : "tapSpeak",
            )}
            aria-pressed={recording && voiceTarget === "request"}
          >
            <Microphone />
            <span>
              {t(
                starting && voiceTarget === "request"
                  ? "loading"
                  : recording && voiceTarget === "request"
                    ? "tapStop"
                    : "tapSpeak",
              )}
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
        {asking && summary === null && (
          <section
            className="clarify-chat"
            aria-label={t("clarifyLog")}
            ref={(node) => node?.scrollIntoView({ block: "nearest" })}
          >
            <div className="clarify-log" role="log">
              {turns.map((turn) => (
                <div key={turn.slot}>
                  <div className="bubble-line">
                    <p className="bubble received">{turn.question}</p>
                    <button
                      type="button"
                      className="bubble-speak"
                      aria-label={t("playMessage")}
                      onClick={() =>
                        speakMessage(turn.question, locale)
                      }
                    >
                      <Speaker />
                    </button>
                  </div>
                  <p className="bubble sent">{turn.answer}</p>
                </div>
              ))}
              {pending && (
                <div className="bubble-line">
                  <p className="bubble received">{pending.question}</p>
                  <button
                    type="button"
                    className="bubble-speak"
                    aria-label={t("playMessage")}
                    onClick={() =>
                      speakMessage(pending.question, locale)
                    }
                  >
                    <Speaker />
                  </button>
                </div>
              )}
            </div>
            <div className="clarify-compose">
              <label className="field">
                <span className="sr-only">{t("clarifyAnswer")}</span>
                <textarea
                  rows={2}
                  maxLength={4000}
                  placeholder={t("clarifyAnswer")}
                  aria-label={t("clarifyAnswer")}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={busy || transcribing}
                />
              </label>
              <button
                className={
                  "clarify-voice " +
                  (recording && voiceTarget === "answer" ? "is-recording" : "")
                }
                type="button"
                disabled={
                  busy ||
                  starting ||
                  transcribing ||
                  (recording && voiceTarget !== "answer")
                }
                onClick={() => void toggleRecording("answer")}
                aria-label={t(
                  recording && voiceTarget === "answer" ? "tapStop" : "tapSpeak",
                )}
                aria-pressed={recording && voiceTarget === "answer"}
              >
                <Microphone />
              </button>
            </div>
            <button
              className="button w-full"
              type="button"
              disabled={
                busy || recording || starting || transcribing || !draft.trim()
              }
              onClick={() => {
                const answer = draft.trim();
                if (!answer || !pending) return;
                const next = [...turns, { slot: pending.slot, question: pending.question, answer }];
                void deliver(next, true);
              }}
            >
              {t(busy ? "clarifyChecking" : "clarifySend")}
            </button>
          </section>
        )}
        {summary !== null && (
          <section className="request-summary" aria-label={t("taskSummary")}>
            <h2>{t("taskSummary")}</h2>
            <p className="text-sm text-muted">{t("confirmRequest")}</p>
            <label className="field">
              <span className="sr-only">{t("taskSummary")}</span>
              <textarea
                rows={4}
                maxLength={4000}
                value={summary}
                aria-label={t("taskSummary")}
                onChange={(e) => setSummary(e.target.value)}
                disabled={busy}
              />
            </label>
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
        disabled={busy || recording || starting || transcribing || (summary !== null && !summary.trim())}
      >
        {t(
          busy
            ? summary !== null || asking
              ? "clarifyChecking"
              : "sending"
            : transcribing
              ? "transcribing"
              : summary !== null
                ? "sendRequest"
                : asking
                  ? "clarifySkip"
                  : "sendRequest",
        )}
      </button>
    </form>
  );
}
