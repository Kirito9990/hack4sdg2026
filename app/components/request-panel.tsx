"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api, post, useApp } from "./providers";
import CallControl from "./call-control";
import RequestNavigation from "./request-navigation";
import LocationMap from "./location-map";
import PriorityCard from "./priority-card";
import ResidentVolunteerMap from "./resident-volunteer-map";
import RequestProgress, { ProgressLink } from "./request-progress";
import { IMAGE_ACCEPT, isAcceptedImage } from "@/lib/image-accept";
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
export function Conversation({ request: r }: { request: RequestView }) {
  const { t, user, locale } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]),
    [text, setText] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loadedFor, setLoadedFor] = useState("");
  const version = r.id + ":" + r.status;
  const visibleMessages = loadedFor === version ? messages : [];
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
        if (live) { setMessages(b.messages); setLoadedFor(version); }
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
  }, [r.id, r.chatReadable, version]);
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
        </div>
        {r.status === "ACCEPTED" && <CallControl request={r}/>}
      </header>
      <div
        className="conversation-log"
        ref={box}
        role="log"
        aria-live="polite"
        aria-label={t("chat")}
      >
        {r.imageData && (
          <div className="bubble received">
            <p className="mb-2 text-xs">{t("requestPhoto")}</p>
            <Photo src={r.imageData} label={t("requestPhoto")} />
          </div>
        )}
        {!r.chatReadable ? (
          <p className="chat-system">{t("chatUnavailable")}</p>
        ) : visibleMessages.length ? (
          visibleMessages.map((m) => (
            <div
              key={m.id}
              className={
                "bubble " + (m.senderId === user?.id ? "sent" : "received")
              }
            >
              {m.imageData && (
                <Photo src={m.imageData} label={t("photoMessage")} />
              )}
              {m.imageHidden && <p className="text-sm text-muted">{t("historyPhotoHidden")}</p>}
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
            accept={IMAGE_ACCEPT}
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
              if (!isAcceptedImage(f)) {
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
    pending = r.status === "PENDING",
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
      {pending ? (
        <details className="pending-card">
          <summary className="pending-card-summary" aria-label={t("pendingSummaryToggle")}>
            <span className="status-symbol" aria-hidden>↗</span>
            <span className="pending-card-heading">
              <h2>{t("requestSent")}</h2>
              <small>{t("waitingHint")}</small>
            </span>
            <span className="pending-card-caret" aria-hidden>⌄</span>
          </summary>
          <div className="pending-card-body">
            <PriorityCard {...r} />
            {r.transcript && r.transcript !== r.summary && (
              <p className="whitespace-pre-wrap break-words text-sm">
                <span className="font-semibold">{t("whatTheySaid")} </span>
                {r.transcript}
              </p>
            )}
            {r.imageData && (
              <Photo src={r.imageData} label={t("requestPhoto")} />
            )}
            {r.imageHidden && <p className="text-sm text-muted">{t("historyPhotoHidden")}</p>}
            {r.residentAddress && <div><strong>{t("defaultAddress")}</strong><p className="whitespace-pre-line">{r.residentAddress}</p></div>}
          </div>
        </details>
      ) : (
        !accepted && <div
          role="status"
          className={
            "status-banner " +
            (closed
              ? "status-complete"
              : "status-waiting")
          }
        >
          <span className="status-symbol" aria-hidden>
            {closed ? "✓" : "↗"}
          </span>
          <div>
            <h2>
              {t(
                closed
                  ? r.closedReason === "completed"
                    ? "completedTitle"
                    : "closed"
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
                  : "waitingHint",
              )}
            </p>
          </div>
        </div>
      )}
      {pending && r.lat !== undefined && r.lng !== undefined && (
        <LocationMap
          lat={r.lat}
          lng={r.lng}
          title={t("requestLocation")}
          points={[{ id: r.id, lat: r.lat, lng: r.lng, label: t(r.category) }]}
          radius={5000}
          heightClassName="h-[50vh]"
          allowFullscreen
          legend={t("pendingMapLegend")}
        />
      )}
      {(accepted || (closed && r.chatReadable)) && (
        <div className="segmented" role="tablist" aria-label={t("yourTask")}>
          {["conversation", "progressTab", ...(accepted ? ["mapTab"] : [])].map(
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
      {accepted && tab !== "progressTab" && <ProgressLink onOpen={() => setTab("progressTab")} />}
      {!pending && (
        <div className="request-stage">
          {r.chatReadable && tab === "conversation" ? (
            <Conversation key={r.id} request={r} />
          ) : accepted && tab === "mapTab" && r.lat !== undefined && r.lng !== undefined ? (
            resident ? <ResidentVolunteerMap request={r} /> : <RequestNavigation key={r.id} request={{ ...r, lat: r.lat, lng: r.lng }} />
          ) : (
            <div className="stage-scroll request-details">
              {(accepted || closed) && <RequestProgress request={r} />}
              <div className="request-summary">
              <h3>{t("taskSummary")}</h3>
              <PriorityCard {...r} />
              {r.transcript && r.transcript !== r.summary && (
                <p className="whitespace-pre-wrap break-words">
                  <span className="font-semibold">{t("whatTheySaid")} </span>
                  {r.transcript}
                </p>
              )}
              {r.imageData && (
                <Photo src={r.imageData} label={t("requestPhoto")} />
              )}
              {r.imageHidden && <p className="text-sm text-muted">{t("historyPhotoHidden")}</p>}
              {r.residentAddress && <div><strong>{t("defaultAddress")}</strong><p className="whitespace-pre-line">{r.residentAddress}</p></div>}
              </div>
            </div>
          )}
        </div>
      )}
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
        ) : null)}
    </article>
  );
}
