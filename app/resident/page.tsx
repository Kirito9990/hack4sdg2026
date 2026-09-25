"use client";
import { useApp } from "@/app/components/providers";
import { useRoleProfile } from "@/lib/profile";
import { useLocation, useRequests } from "@/lib/client-hooks";
import RequestForm from "@/app/components/request-form";
import RequestPanel from "@/app/components/request-panel";
import LocationMap from "@/app/components/location-map";
export default function Resident() {
  const { t } = useApp(),
    { ready, profile } = useRoleProfile("resident"),
    geo = useLocation(!!profile),
    feed = useRequests(!!profile);
  if (!ready || !profile)
    return (
      <main className="page">
        <p>{t("loading")}</p>
      </main>
    );
  return (
    <main className="page max-w-6xl">
      <h1>{t("requestHelp")}</h1>
      <p className="hint">{t("requestIntro")}</p>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {feed.error && (
            <p className="error" role="alert">
              {t(feed.error)}
            </p>
          )}
          {feed.requests
            .filter((r) => r.status !== "CLOSED")
            .map((r) => (
              <RequestPanel key={r.id} request={r} refresh={feed.refresh} />
            ))}
          <section className="panel">
            <RequestForm coords={geo.coords} onSent={feed.refresh} />
          </section>
          {feed.requests.some((r) => r.status === "CLOSED") && (
            <details>
              <summary className="py-3 font-semibold">{t("history")}</summary>
              <div className="space-y-4">
                {feed.requests
                  .filter((r) => r.status === "CLOSED")
                  .map((r) => (
                    <RequestPanel
                      key={r.id}
                      request={r}
                      refresh={feed.refresh}
                    />
                  ))}
              </div>
            </details>
          )}
        </div>
        <aside className="space-y-4">
          {geo.coords ? (
            <LocationMap
              lat={geo.coords.lat}
              lng={geo.coords.lng}
              title={t("requestLocation")}
            />
          ) : (
            <p role="status">{t(geo.error || "findingLocation")}</p>
          )}
          {geo.error && (
            <button className="button secondary" onClick={geo.retry}>
              {t("retry")}
            </button>
          )}
          <p className="panel text-sm leading-6 text-muted">
            {t("locationPrivacy")}
          </p>
        </aside>
      </div>
    </main>
  );
}
