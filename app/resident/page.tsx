"use client";
import { useState } from "react";
import { useApp } from "@/app/components/providers";
import { useRoleProfile } from "@/lib/profile";
import { useLocation, useRequests } from "@/lib/client-hooks";
import RequestForm from "@/app/components/request-form";
import RequestPanel from "@/app/components/request-panel";
import HistoryList from "@/app/components/history-list";
import LocationPicker from "@/app/components/location-picker";
import AcceptanceNotice from "@/app/components/acceptance-notice";
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
    <main className={"mobile-app" + (actualTab === "activity" && request?.status === "ACCEPTED" ? " active-task" : "")}>
      <AcceptanceNotice requests={feed.requests} />
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">{t("resident")}</p>
          <h1>
            {t(
              actualTab === "newHelp"
                ? "requestHelp"
                : actualTab === "history"
                  ? "history"
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
        <div
          className="form-surface"
          style={{ display: actualTab === "newHelp" ? "flex" : "none" }}
        >
          <RequestForm
            coords={geo.coords}
            onLocate={geo.locate}
            location={
              <LocationPicker
                coords={geo.coords}
                locating={geo.locating}
                error={geo.error}
                onLocate={geo.retry}
                onPick={geo.pick}
                compact
              />
            }
            onSent={async (saved) => {
              feed.add(saved);
              setSelected(saved.id);
              setTab("activity");
              await feed.refresh();
            }}
          />
        </div>
        {actualTab === "history" ? (
          <HistoryList requests={feed.requests.filter(r=>r.status==='CLOSED')}/>
        ) : actualTab === "activity" ? (
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
                          ? "helpInProgress"
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
        ) : null}
      </div>
      <nav className="bottom-tabs" aria-label={t("home")}>
        {[
          ["newHelp", "＋"],
          ["activity", "◷"],
          ["history", "◴"],
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
