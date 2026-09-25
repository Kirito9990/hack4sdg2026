"use client";
import { useState } from "react";
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
  const [tab, setTab] = useState("activity"),
    [selected, setSelected] = useState("");
  const request =
    feed.requests.find((r) => r.id === selected) ||
    feed.requests.find((r) => r.status !== "CLOSED") ||
    feed.requests[0];
  const actualTab =
    tab === "activity" && !feed.requests.length ? "newHelp" : tab;
  if (!ready || !profile) return <main className="page">{t("loading")}</main>;
  return (
    <main className="mobile-app">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">{t("resident")}</p>
          <h1>
            {t(
              actualTab === "newHelp"
                ? "requestHelp"
                : actualTab === "mapTab"
                  ? "location"
                  : "activity",
            )}
          </h1>
        </div>
      </div>
      {feed.error && (
        <p className="error" role="alert">
          {t(feed.error)}
        </p>
      )}
      <div className="app-stage">
        {actualTab === "newHelp" ? (
          <div className="form-surface">
            {!geo.coords && (
              <div className="location-alert" role="status">
                {t(geo.error || "findingLocation")}
                {geo.error && (
                  <button className="underline ml-3" onClick={geo.retry}>
                    {t("retry")}
                  </button>
                )}
              </div>
            )}
            <RequestForm
              coords={geo.coords}
              onSent={async (id) => {
                await feed.refresh();
                setSelected(id);
                setTab("activity");
              }}
            />
          </div>
        ) : actualTab === "mapTab" ? (
          <div className="stage-scroll">
            {geo.coords ? (
              <LocationMap
                lat={geo.coords.lat}
                lng={geo.coords.lng}
                title={t("requestLocation")}
              />
            ) : (
              <p>{t(geo.error || "findingLocation")}</p>
            )}
            <p className="text-sm text-muted mt-3">{t("locationPrivacy")}</p>
            <button className="button secondary mt-3" onClick={geo.retry}>
              {t("retry")}
            </button>
          </div>
        ) : (
          <div className="activity-stage">
            {feed.requests.length > 1 && (
              <select
                className="request-picker"
                aria-label={t("chooseRequest")}
                value={request?.id || ""}
                onChange={(e) => setSelected(e.target.value)}
              >
                {feed.requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t(
                      r.status === "CLOSED"
                        ? "closed"
                        : r.status === "ACCEPTED"
                          ? "accepted"
                          : "pending",
                    )}{" "}
                    · {t(r.category)} · {r.id.slice(0, 6)}
                  </option>
                ))}
              </select>
            )}
            {request && (
              <RequestPanel
                key={request.id}
                request={request}
                refresh={feed.refresh}
              />
            )}
          </div>
        )}
      </div>
      <nav className="bottom-tabs" aria-label={t("home")}>
        {[
          ["newHelp", "＋"],
          ["activity", "◷"],
          ["mapTab", "⌖"],
        ].map(([k, icon]) => (
          <button
            key={k}
            aria-current={actualTab === k ? "page" : undefined}
            onClick={() => setTab(k)}
          >
            <span aria-hidden>{icon}</span>
            {t(k)}
          </button>
        ))}
      </nav>
    </main>
  );
}
