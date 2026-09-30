"use client";

import { useState } from "react";
import MapAppChooser from "./map-app-chooser";
import { useLiveLocation } from "@/lib/use-live-location";
import type { RequestView } from "@/lib/types";
import LocationMap from "./location-map";
import { useApp } from "./providers";

export default function RequestNavigation({ request }: { request: RequestView & { lat: number; lng: number } }) {
  const { t, locale } = useApp();
  const [follow, setFollow] = useState(true);
  const geo = useLiveLocation();
  return (
    <section className="navigation-panel" aria-label={t("getDirections")}>
      <div className="stage-scroll navigation-content">
      <LocationMap lat={request.lat} lng={request.lng} showPosition={false}
        title={t("requestLocation")}
        points={[{ id: request.id, lat: request.lat, lng: request.lng, label: t("destination"), accepted: true }]}
        livePosition={geo.position} positionStale={geo.stale} followPosition={follow} onExplore={() => setFollow(false)}
        heightClassName="h-[42vh]"
        legend={t("navigationMapLegend")} />
      {request.residentAddress && <div className="navigation-address"><strong>{t("arrivalAddress")}</strong><p className="whitespace-pre-line break-words">{request.residentAddress}</p></div>}
      <p className="text-sm">{t("entranceHint")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="button secondary" onClick={() => {
          if (geo.enabled) geo.stop();
          else { setFollow(true); geo.start(); }
        }}>{t(geo.enabled ? "stopLiveLocation" : "startLiveLocation")}</button>
        {geo.position && <button type="button" className="button secondary" aria-pressed={follow} onClick={() => setFollow(!follow)}>{t(follow ? "followingLocation" : "followLocation")}</button>}
      </div>
      <div role="status" className="text-sm" aria-live="polite">
        {geo.error ? t(geo.error) : geo.enabled ? t(!geo.visible ? "liveLocationPaused" : !geo.position ? "findingLocation" : geo.stale ? "liveLocationStale" : "liveLocationActive") : t("liveLocationOff")}
      </div>
      {geo.position && <p className="text-xs text-muted">
        {t("lastLocationUpdate")} {new Date(geo.position.timestamp).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        {" · "}{t("locationAccuracy")} ±{Math.ceil(geo.position.accuracy)} {t("metres")}
        {geo.position.accuracy > 100 && <span className="block">{t("lowLocationAccuracy")}</span>}
      </p>}
      <p className="text-xs text-muted">{t("liveLocationHint")}</p>
      </div>
      <div className="navigation-launch">
        <MapAppChooser destination={request} />
        <p>{t("chooseTravelInMap")}</p>
      </div>
    </section>
  );
}
