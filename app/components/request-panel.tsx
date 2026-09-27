"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, post, useApp } from "./providers";
import CallControl from "./call-control";
import RequestNavigation from "./request-navigation";
import PriorityCard from "./priority-card";
import type { ChatMessage, RequestView } from "@/lib/types";

function Photo({ src, label }: { src: string; label: string }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" aria-label={label}>
      <Image
        unoptimized
        src={src}
        width={480}
        height={360}
        alt={label}
        className="chat-photo"
      />
    </a>
  );
}
function Conversation({ request: r }: { request: RequestView }) {
  const { t, user, locale } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]),
    [text, setText] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    const id = setTimeout(() => setPreview(url), 0);
    return () => {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    };
  }, [photo]);
  useEffect(() => {
    if (!r.chatReadable) return;
    let live = true;
    const poll = async () => {
      try {
        const b = await api<{ messages: ChatMessage[] }>(
          "/api/request/chat?id=" + encodeURIComponent(r.id),
        );
        if (live) setMessages(b.messages);
      } catch (e) {
        if (live) {
          setError((e as Error).message);
          setMessages([]);
        }
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 2000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [r.id, r.chatReadable]);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length]);
  return (
    <section className="conversation">
      <header className="conversation-header">
        <div className="min-w-0">
          <strong className="block truncate">
            {(user?.role === "resident" ? r.volunteerName : r.residentName) || t(user?.role === "resident" ? "volunteer" : "resident")}
          </strong>
          <span className="text-xs text-muted">{t("chat")}</span>
        </div>
        <CallControl request={r}/>
      </header>
      <div
        className="conversation-log"
        ref={box}
        role="log"
        aria-live="polite"
        aria-label={t("chat")}
      >
        <p className="chat-system">{t("attachmentNotice")}</p>
        {r.imageData && (
          <div className="bubble received">
            <p className="mb-2 text-xs">{t("requestPhoto")}</p>
            <Photo src={r.imageData} label={t("requestPhoto")} />
          </div>
        )}
        {!r.chatReadable ? (
          <p className="chat-system">{t("chatUnavailable")}</p>
        ) : messages.length ? (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                "bubble " + (m.senderId === user?.id ? "sent" : "received")
              }
            >
              {m.imageData && (
                <Photo src={m.imageData} label={t("photoMessage")} />
              )}
              {m.text && (
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
              )}
              <p className="mt-1 text-right text-xs opacity-70">
                {m.senderId === user?.id ? t("you") : t("partner")} ·{" "}
                {new Date(m.createdAt).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))
        ) : (
          <p className="chat-system">{t("noMessages")}</p>
        )}
      </div>
      {error && (
        <p className="error mx-3 text-sm" role="alert">
          {t(error)}
        </p>
      )}
      {photo && r.chatAvailable && (
        <div className="attachment-preview">
          {preview && (
            <Image
              unoptimized
              src={preview}
              alt={t("photoPreview")}
              width={56}
              height={56}
            />
          )}
          <span className="truncate flex-1">{photo.name}</span>
          <button
            type="button"
            onClick={() => {
              setPhoto(null);
              setPreview("");
            }}
            aria-label={t("removePhoto")}
          >
            ×
          </button>
        </div>
      )}
      {r.chatAvailable && (
        <form
          className="chat-composer"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || (!text.trim() && !photo)) return;
            setBusy(true);
            setError("");
            try {
              const body = new FormData();
              body.set("id", r.id);
              body.set("text", text);
              if (photo) body.set("image", photo);
              const b = await api<{ message: ChatMessage }>(
                "/api/request/chat",
                { method: "POST", body },
              );
              setMessages((ms) =>
                ms.some((m) => m.id === b.message.id) ? ms : [...ms, b.message],
              );
              setText("");
              setPhoto(null);
              setPreview("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
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
              setError("");
              setPreview("");
              setPhoto(f);
            }}
          />
          <button
            type="button"
            className="attach-button"
            onClick={() => input.current?.click()}
            disabled={busy}
            aria-label={t("addPhoto")}
          >
            ＋
          </button>
          <textarea
            rows={1}
            aria-label={t("message")}
            placeholder={t("chatPlaceholder")}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          <button
            className="send-button"
            disabled={busy || (!text.trim() && !photo)}
            aria-label={t("send")}
          >
            {busy ? "…" : "↑"}
          </button>
        </form>
      )}
      {!r.chatAvailable && r.chatReadable && <p className="readonly-chat" role="status">{t("chatReadOnly")}</p>}
      <details className="chat-privacy">
        <summary>{t("contactPrivacy")}</summary>
        {r.chatExpiresAt && (
          <p>
            {t("expires")}: {new Date(r.chatExpiresAt).toLocaleString(locale)}
          </p>
        )}
        <p>{t("dialer")}</p>
        {!r.callPhone && <p>{t("callsDisabled")}</p>}
        {r.testCall && (
          <p>
            {t("testCall")}: {r.callPhone}
          </p>
        )}
        <Link href="/account" className="underline">
          {t("privacy")}
        </Link>
      </details>
    </section>
  );
}
export default function RequestPanel({
  request: r,
  refresh,
}: {
  request: RequestView;
  refresh: () => Promise<void>;
}) {
  const { t, user } = useApp();
  const [tab, setTab] = useState("conversation"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const accepted = r.status === "ACCEPTED",
    closed = r.status === "CLOSED",
    resident = user?.role === "resident";
  async function finish() {
    if (!confirm(t(accepted ? "finishConfirm" : "closeConfirm"))) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/request/close", { id: r.id });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="request-workspace" id={"request-" + r.id}>
      <div
        role="status"
        className={
          "status-banner " +
          (closed
            ? "status-complete"
            : accepted
              ? "status-matched"
              : "status-waiting")
        }
      >
        <span className="status-symbol" aria-hidden>
          {closed ? "✓" : accepted ? "✓" : "↗"}
        </span>
        <div>
          <h2>
            {t(
              closed
                ? r.closedReason === "completed"
                  ? "completedTitle"
                  : "closed"
                : accepted
                  ? "matchedTitle"
                  : "requestSent",
            )}
          </h2>
          <p>
            {t(
              closed
                ? r.closedReason === "completed"
                  ? resident
                    ? "completedHint"
                    : "residentConfirmed"
                  : "closed"
                : accepted
                  ? resident
                    ? "accepted"
                    : "yourTask"
                  : "waitingHint",
            )}
          </p>
        </div>
      </div>
      {!(accepted && !resident && tab === "mapTab") && <PriorityCard {...r} />}
      {(accepted || (closed && r.chatReadable)) && (
        <div className="segmented" role="tablist" aria-label={t("yourTask")}>
          {["conversation", "detailsTab", ...(!resident && accepted ? ["mapTab"] : [])].map(
            (k) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
              >
                {t(k)}
              </button>
            ),
          )}
        </div>
      )}
      <div className="request-stage">
        {r.chatReadable && tab === "conversation" ? (
          <Conversation key={r.id} request={r} />
        ) : !resident && accepted && tab === "mapTab" ? (
          <RequestNavigation key={r.id} request={r} />
        ) : (
          <div className="stage-scroll request-details">
            {r.residentAddress && <div><strong>{t("defaultAddress")}</strong><p className="whitespace-pre-line">{r.residentAddress}</p></div>}
            {!closed && (
              <ol className="progress-steps">
                <li className="done">{t("requestSent")}</li>
                <li className={accepted ? "done" : ""}>{t("accepted")}</li>
                <li>{t("completedTitle")}</li>
              </ol>
            )}
            {(r.transcript || r.summary) && (
              <p className="whitespace-pre-wrap break-words">
                {r.transcript ||
                  (r.summary === "mediaRequest"
                    ? t("mediaRequest")
                    : r.summary)}
              </p>
            )}
            {r.imageData && (
              <Photo src={r.imageData} label={t("requestPhoto")} />
            )}
            {!closed && (
              <details>
                <summary>{t("processed")}</summary>
                <p className="hint text-sm">
                  {t(r.source === "fallback" ? "fallback" : "processed")}
                </p>
                {r.audioStatus !== "none" && (
                  <p>
                    {t(
                      r.audioStatus === "transcribed"
                        ? "transcribed"
                        : r.audioStatus === "provided"
                          ? "audioProvided"
                          : "audioUnavailable",
                    )}
                  </p>
                )}
                {r.imageStatus !== "none" && (
                  <p>
                    {t(
                      r.imageStatus === "analyzed"
                        ? "imageAnalyzed"
                        : "imagePrepared",
                    )}
                  </p>
                )}
              </details>
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
      {!closed && r.dispatch_action.startsWith("EMERGENCY") && (
        <a
          className="button bg-danger"
          href={"tel:" + (process.env.NEXT_PUBLIC_EMERGENCY_NUMBER || "999")}
        >
          {t("emergencyCall")} 999
        </a>
      )}
      {!closed &&
        (resident ? (
          <button
            className={
              "button w-full " + (accepted ? "finish-button" : "secondary")
            }
            disabled={busy}
            onClick={() => void finish()}
          >
            {t(busy ? "saving" : accepted ? "finishHelp" : "cancelRequest")}
          </button>
        ) : (
          <p className="text-center text-xs text-muted">
            {t("awaitCompletion")}
          </p>
        ))}
    </article>
  );
}
