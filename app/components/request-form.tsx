"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api, useApp } from "./providers";
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export default function RequestForm({
  coords,
  onSent,
}: {
  coords: { lat: number; lng: number } | null;
  onSent: () => Promise<void>;
}) {
  const { t, locale } = useApp(),
    [text, setText] = useState(""),
    [audio, setAudio] = useState<Blob | null>(null),
    [audioUrl, setAudioUrl] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [photoUrl, setPhotoUrl] = useState(""),
    [recording, setRecording] = useState(false),
    [starting, setStarting] = useState(false),
    [dictating, setDictating] = useState(false),
    [speechConsent, setSpeechConsent] = useState(false),
    [language, setLanguage] = useState("zh-HK"),
    [busy, setBusy] = useState(false),
    [imageBusy, setImageBusy] = useState(false),
    [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    recognition = useRef<Recognition | null>(null),
    generation = useRef(0),
    imageGeneration = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!audio) return;
    const url = URL.createObjectURL(audio);
    const id = setTimeout(() => setAudioUrl(url), 0);
    return () => {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    };
  }, [audio]);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    const id = setTimeout(() => setPhotoUrl(url), 0);
    return () => {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    };
  }, [photo]);
  useEffect(
    () => () => {
      generation.current++;
      imageGeneration.current++;
      recognition.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    if (timer.current) clearTimeout(timer.current);
    setRecording(false);
  }
  async function record() {
    if (recording) {
      stop();
      return;
    }
    const token = ++generation.current;
    setStarting(true);
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const r = new MediaRecorder(media, mime ? { mimeType: mime } : undefined),
        chunks: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (token === generation.current) {
          const blob = new Blob(chunks, { type: r.mimeType });
          if (blob.size > 8 * 1024 * 1024) setError("fileTooLarge");
          else setAudio(blob);
          setRecording(false);
        }
      };
      r.onerror = () => {
        media.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setError("micError");
      };
      recorder.current = r;
      r.start();
      setAudio(null);
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 60000);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      setError("micError");
    } finally {
      setStarting(false);
    }
  }
  function dictate() {
    if (dictating) {
      recognition.current?.stop();
      return;
    }
    const Speech =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Speech) {
      setError("speechUnavailable");
      return;
    }
    const speech = new Speech();
    speech.lang = language === "en" ? "en-HK" : language;
    speech.continuous = true;
    speech.interimResults = false;
    speech.onresult = (e) => {
      let words = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) words += e.results[i][0].transcript + " ";
      }
      if (words)
        setText((value) => (value + " " + words).trim().slice(0, 4000));
    };
    speech.onerror = () => {
      setError("speechUnavailable");
      setDictating(false);
    };
    speech.onend = () => setDictating(false);
    recognition.current = speech;
    try {
      speech.start();
      setDictating(true);
      setError("");
    } catch {
      setError("speechUnavailable");
    }
  }
  async function preparePhoto(file: File | undefined) {
    const token = ++imageGeneration.current;
    if (!file) {
      setPhoto(null);
      return;
    }
    setError("");
    setImageBusy(true);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("fileTooLarge");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("invalidImage");
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 25000000) {
        bitmap.close();
        throw new Error("invalidImage");
      }
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)),
        canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("invalidImage"))),
          "image/jpeg",
          0.82,
        ),
      );
      if (token === imageGeneration.current)
        setPhoto(new File([blob], "request-photo.jpg", { type: "image/jpeg" }));
    } catch (e) {
      if (token === imageGeneration.current) {
        setPhoto(null);
        setError(
          (e as Error).message === "fileTooLarge"
            ? "fileTooLarge"
            : "invalidImage",
        );
      }
    } finally {
      if (token === imageGeneration.current) setImageBusy(false);
    }
  }
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (!coords) {
          setError("locationError");
          return;
        }
        if (!text.trim() && !audio && !photo) {
          setError("emptyRequest");
          return;
        }
        setBusy(true);
        try {
          const body = new FormData();
          body.set("lat", String(coords.lat));
          body.set("lng", String(coords.lng));
          body.set("text", text);
          body.set("locale", locale);
          body.set("language", language);
          if (audio) body.set("audio", audio, "voice-note");
          if (photo) body.set("image", photo);
          await api("/api/triage", { method: "POST", body });
          setText("");
          setAudio(null);
          setPhoto(null);
          await onSent();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        {t("description")}
        <textarea
          rows={4}
          maxLength={4000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <label className="field">
        {t("speechLanguage")}
        <select
          disabled={recording || dictating}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="zh-HK">{t("cantonese")}</option>
          <option value="zh-CN">{t("mandarin")}</option>
          <option value="en">{t("english")}</option>
        </select>
      </label>
      <div className="panel space-y-3">
        <button
          type="button"
          className={"button w-full " + (recording ? "bg-danger" : "secondary")}
          disabled={busy || dictating || starting}
          onClick={() => void record()}
        >
          <span aria-hidden className="text-xl">
            ●
          </span>
          {t(starting ? "loading" : recording ? "stop" : "record")}
        </button>
        <p className="text-sm text-muted">{t("recordLimit")}</p>
        {recording && <p role="status">{t("recording")}</p>}
        {audio && (
          <>
            <p role="status">{t("recordReady")}</p>
            <audio controls src={audioUrl} className="w-full" />
            <button
              type="button"
              className="min-h-11 underline"
              onClick={() => setAudio(null)}
            >
              {t("removeAudio")}
            </button>
          </>
        )}
        <details>
          <summary className="cursor-pointer py-2 font-semibold">
            {t("dictate")}
          </summary>
          <p className="hint text-sm">{t("speechConsent")}</p>
          <label className="my-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={speechConsent}
              onChange={(e) => {
                setSpeechConsent(e.target.checked);
                if (!e.target.checked) recognition.current?.abort();
              }}
              className="mt-1 h-5 w-5"
            />
            {t("speechAgree")}
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={!speechConsent || recording || starting || busy}
            onClick={dictate}
          >
            {t(dictating ? "stopDictation" : "dictate")}
          </button>
        </details>
      </div>
      <label className="button secondary w-full cursor-pointer focus-within:ring-2 focus-within:ring-foreground">
        {t("addPhoto")}
        <input
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => void preparePhoto(e.target.files?.[0])}
        />
      </label>
      {imageBusy && <p role="status">{t("loading")}</p>}
      {photo && (
        <div className="panel">
          <Image
            unoptimized
            width={640}
            height={480}
            src={
              photoUrl ||
              "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
            }
            alt={t("photoPreview")}
            className="max-h-64 w-full rounded-xl object-contain"
          />
          <p className="hint text-sm">{t("imagePrepared")}</p>
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => {
              imageGeneration.current++;
              setPhoto(null);
            }}
          >
            {t("removePhoto")}
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      <button
        className="button w-full"
        disabled={
          busy || recording || starting || dictating || imageBusy || !coords
        }
      >
        {t(busy ? "sending" : "sendRequest")}
      </button>
    </form>
  );
}
