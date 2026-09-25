"use client";
import { useEffect, useRef, useState } from "react";
import { api, post, useApp } from "./providers";
import { PhoneIcon } from "./shell";
import LocationMap from "./location-map";
import type { ChatMessage, RequestView } from "@/lib/types";
function Chat({ request }: { request: RequestView }) {
  const { t, user, locale } = useApp(),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const b = await api<{ messages: ChatMessage[] }>(
          "/api/request/chat?id=" + encodeURIComponent(request.id),
        );
        if (active) {
          setMessages(b.messages);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setMessages([]);
        }
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [request.id]);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length]);
  return (
    <section className="panel">
      <h2>{t("chat")}</h2>
      <p className="hint text-sm">{t("chatHint")}</p>
      <p className="text-sm text-muted">
        {t("expires")}:{" "}
        {new Date(request.chatExpiresAt!).toLocaleString(locale)}
      </p>
      <div
        ref={box}
        className="my-4 max-h-72 space-y-3 overflow-y-auto rounded-xl bg-background p-3"
        role="log"
        aria-label={t("chat")}
        aria-live="polite"
      >
        {messages.length ? (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                m.senderId === user?.id
                  ? "ml-8 rounded-xl bg-foreground p-3 text-white"
                  : "mr-8 rounded-xl border border-line bg-white p-3"
              }
            >
              <p className="text-xs opacity-75">
                {m.senderId === user?.id ? t("you") : t("partner")} ·{" "}
                {new Date(m.createdAt).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
            </div>
          ))
        ) : (
          <p className="hint">{t("noMessages")}</p>
        )}
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setBusy(true);
          try {
            const b = await post<{ message: ChatMessage }>(
              "/api/request/chat",
              { id: request.id, text },
            );
            setMessages((ms) =>
              ms.some((m) => m.id === b.message.id) ? ms : [...ms, b.message],
            );
            setText("");
            setError("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field min-w-0 flex-1">
          {t("message")}
          <textarea
            maxLength={1000}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </label>
        <button className="button" disabled={busy || !text.trim()}>
          {t(busy ? "sending" : "send")}
        </button>
      </form>
      {error && (
        <p className="error mt-3" role="alert">
          {t(error)}
        </p>
      )}
    </section>
  );
}
export default function RequestPanel({
  request: r,
  coords,
  refresh,
}: {
  request: RequestView;
  coords?: { lat: number; lng: number } | null;
  refresh: () => Promise<void>;
}) {
  const { t, user } = useApp(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [route, setRoute] = useState<{
      coordinates: number[][];
      distance: number;
      duration: number;
    } | null>(null),
    [routing, setRouting] = useState(false);
  const accepted = r.status === "ACCEPTED",
    emergency = r.dispatch_action.startsWith("EMERGENCY");
  const summary = r.summary === "mediaRequest" ? t("mediaRequest") : r.summary;
  return (
    <article id={"request-" + r.id} className="space-y-4 scroll-mt-4">
      <section className={"panel " + (accepted ? "border-ok" : "")}>
        <p className="mb-2 text-sm font-semibold text-muted">
          {t(
            r.status === "PENDING"
              ? "pending"
              : r.status === "CLOSED"
                ? "closed"
                : user?.role === "resident"
                  ? "accepted"
                  : "yourTask",
          )}
        </p>
        <h2 className="break-words">{summary}</h2>
        {accepted && (
          <p className="mt-3 text-lg font-semibold">
            {t("partner")}:{" "}
            {user?.role === "resident" ? r.volunteerName : r.residentName}
          </p>
        )}
        <p className="hint">
          {r.source === "fallback" ? t("unassessed") : t(r.urgency_level)} ·{" "}
          {t(r.category)}
        </p>
        {emergency && r.status !== "CLOSED" && (
          <a
            className="call-button mt-4 bg-danger"
            href={"tel:" + (process.env.NEXT_PUBLIC_EMERGENCY_NUMBER || "999")}
          >
            <PhoneIcon />
            {t("emergencyCall")}{" "}
            {process.env.NEXT_PUBLIC_EMERGENCY_NUMBER || "999"}
          </a>
        )}
        {accepted && (
          <div className="mt-5 rounded-2xl bg-background p-4">
            {r.callPhone ? (
              <>
                <a
                  className="call-button w-full bg-ok"
                  href={"tel:" + r.callPhone}
                >
                  <PhoneIcon />
                  {t(
                    user?.role === "volunteer"
                      ? "callResident"
                      : "callVolunteer",
                  )}
                </a>
                <p className="mt-3 break-words font-semibold">
                  {r.testCall ? t("testCall") + ": " : ""}
                  {r.callPhone}
                </p>
                {r.testCall && (
                  <p className="hint text-sm">{t("testCallHint")}</p>
                )}
                <p className="hint text-sm">{t("dialer")}</p>
              </>
            ) : (
              <p>{t("callsDisabled")}</p>
            )}
          </div>
        )}
        {r.status !== "CLOSED" && (
          <button
            className="button secondary mt-4"
            disabled={busy}
            onClick={async () => {
              if (!confirm(t("closeConfirm"))) return;
              setBusy(true);
              try {
                await post("/api/request/close", { id: r.id });
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("closeRequest")}
          </button>
        )}
      </section>
      {accepted && coords && user?.role === "volunteer" && (
        <>
          <LocationMap
            lat={coords.lat}
            lng={coords.lng}
            title={t("requestLocation")}
            points={[
              {
                id: r.id,
                lat: r.lat,
                lng: r.lng,
                label: summary,
                accepted: true,
              },
            ]}
            route={route?.coordinates}
          />
          <div className="panel">
            <p className="text-sm leading-6 text-muted">{t("routePrivacy")}</p>
            <button
              className="button mt-3"
              disabled={routing}
              onClick={async () => {
                if (route) {
                  setRoute(null);
                  return;
                }
                setRouting(true);
                setError("");
                try {
                  setRoute(
                    await post("/api/request/route", { id: r.id, ...coords }),
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setRouting(false);
                }
              }}
            >
              {t(routing ? "routeLoading" : route ? "hideRoute" : "showRoute")}
            </button>
            {route && (
              <p className="hint">
                {(route.distance / 1000).toFixed(1)} {t("km")} ·{" "}
                {Math.ceil(route.duration / 60)} {t("minutes")} —{" "}
                {t("routeInfo")}
              </p>
            )}
          </div>
        </>
      )}
      {accepted &&
        (r.chatAvailable ? (
          <Chat request={r} />
        ) : (
          <p className="panel">{t("chatUnavailable")}</p>
        ))}
      {user?.role === "resident" && (
        <details className="panel">
          <summary className="cursor-pointer font-semibold">
            {t("processed")}
          </summary>
          {r.source === "fallback" && <p className="hint">{t("fallback")}</p>}
          {r.audioStatus !== "none" && (
            <p className="hint">
              {t(
                r.audioStatus === "transcribed"
                  ? "transcribed"
                  : r.audioStatus === "provided"
                    ? "audioProvided"
                    : "audioUnavailable",
              )}
            </p>
          )}
          {r.transcript && (
            <p className="mt-2 whitespace-pre-wrap break-words">
              {r.transcript}
            </p>
          )}
          {r.imageStatus !== "none" && (
            <p className="hint">
              {t(
                r.imageStatus === "analyzed"
                  ? "imageAnalyzed"
                  : "imagePrepared",
              )}{" "}
              {r.imageWidth} × {r.imageHeight}
            </p>
          )}
        </details>
      )}
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
    </article>
  );
}
