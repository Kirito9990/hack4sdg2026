"use client";
import { useEffect, useState } from "react";
import type { RequestView } from "@/lib/types";
import LocationMap from "./location-map";
import { useApp } from "./providers";
export default function ResidentVolunteerMap({ request: r }: { request: RequestView }) {
  const { t, locale } = useApp();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const point = r.volunteerLocation;
  const fresh = point && now - point.updatedAt < 60000;
  if (r.lat === undefined || r.lng === undefined) return null;
  return <div className="stage-scroll resident-volunteer-map">
    <p role="status">{t(!r.volunteerLocationSharing ? "volunteerLocationPrivate" : fresh ? "volunteerLocationUpdated" : "locationSharingWaiting")}</p>
    <LocationMap lat={r.lat} lng={r.lng} showPosition={false} title={t("volunteerLocation")}
      points={[{ id: r.id, lat: r.lat, lng: r.lng, label: t("destination"), accepted: true },
        ...(fresh ? [{ id: r.id + "-volunteer", lat: point.lat, lng: point.lng, label: t("volunteer"), accepted: false }] : [])]}
      legend={t("volunteerMapLegend")} />
    {fresh && <p className="text-sm text-muted">{t("lastLocationUpdate")} {new Date(point.updatedAt).toLocaleTimeString(locale)} · ±{Math.ceil(point.accuracy)} {t("metres")}</p>}
  </div>;
}
