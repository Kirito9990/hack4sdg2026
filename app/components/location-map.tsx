"use client";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { useApp } from "./providers";
import type { LivePosition } from "@/lib/use-live-location";
import "leaflet/dist/leaflet.css";
export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  urgency?: "HIGH" | "MEDIUM" | "LOW";
  accepted?: boolean;
};
export default function LocationMap({
  lat,
  lng,
  points = [],
  radius = 0,
  title,
  route,
  compact = false,
  onPick,
  showPosition = true,
  livePosition,
  positionStale = false,
  followPosition = false,
  onExplore,
  legend,
}: {
  lat: number;
  lng: number;
  points?: MapPoint[];
  radius?: number;
  title?: string;
  route?: number[][];
  compact?: boolean;
  onPick?: (point: { lat: number; lng: number }) => void;
  showPosition?: boolean;
  livePosition?: LivePosition | null;
  positionStale?: boolean;
  followPosition?: boolean;
  onExplore?: () => void;
  legend?: string;
}) {
  const { t } = useApp(),
    container = useRef<HTMLDivElement>(null);
  const activeMap = useRef<Leaflet.Map | null>(null);
  const [context, setContext] = useState<{
      api: typeof Leaflet;
      map: Leaflet.Map;
      markers: Leaflet.LayerGroup;
      lines: Leaflet.LayerGroup;
      position: Leaflet.CircleMarker;
      accuracy: Leaflet.Circle;
    } | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const pickRef = useRef(onPick);
  const exploreRef = useRef(onExplore);
  useEffect(() => {
    pickRef.current = onPick;
    exploreRef.current = onExplore;
  }, [onPick, onExplore]);
  const pointsKey = JSON.stringify(points),
    routeKey = JSON.stringify(route ?? []);
  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | undefined, observer: ResizeObserver | undefined;
    void import("leaflet")
      .then((api) => {
        if (cancelled || !container.current) return;
        setError(false);
        map = api
          .map(container.current, {
            scrollWheelZoom: false,
            zoomAnimation: false,
            fadeAnimation: false,
            markerZoomAnimation: false,
          })
          .setView([lat, lng], 16);
        activeMap.current = map;
        api
          .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          })
          .on("tileerror", () => {
            if (!cancelled) setError(true);
          })
          .addTo(map);
        map.on("click", (e: Leaflet.LeafletMouseEvent) =>
          pickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
        );
        map.on("dragstart", () => exploreRef.current?.());
        if (showPosition)
          api
            .circleMarker([lat, lng], {
              radius: 9,
              color: "#fff",
              weight: 3,
              fillColor: "#2563eb",
              fillOpacity: 1,
            })
            .addTo(map)
            .bindTooltip(t("location"));
        if (radius > 0) {
          const area = api
            .circle([lat, lng], {
              radius,
              color: "#2563eb",
              weight: 1,
              fillOpacity: 0.04,
            })
            .addTo(map);
          map.fitBounds(area.getBounds(), {
            padding: [16, 16],
            animate: false,
          });
        }
        const markers = api.layerGroup().addTo(map),
          lines = api.layerGroup().addTo(map);
        const accuracy = api.circle([lat, lng], {
          radius: 0, color: "#2563eb", weight: 1, fillOpacity: 0.08,
          interactive: false, className: "live-location-accuracy",
        });
        const position = api.circleMarker([lat, lng], {
          radius: 9, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1,
          className: "live-location-marker",
        });
        observer = new ResizeObserver(() => map?.invalidateSize());
        observer.observe(container.current);
        setContext({ api, map, markers, lines, position, accuracy });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      if (activeMap.current === map) activeMap.current = null;
      observer?.disconnect();
      map?.stop();
      map?.remove();
    };
  }, [lat, lng, radius, attempt, t, showPosition]);
  useEffect(() => {
    if (!context || context.map !== activeMap.current) return;
    const { api, map, markers } = context;
    markers.clearLayers();
    const items = JSON.parse(pointsKey) as MapPoint[];
    items.forEach((p, i) => {
      const color = p.accepted
        ? "#166534"
        : p.urgency === "HIGH"
          ? "#9f1239"
          : "#9a3412";
      const popup = document.createElement("div"),
        text = document.createElement("p"),
        link = document.createElement("a");
      text.textContent = p.label;
      link.href = "#request-" + encodeURIComponent(p.id);
      link.textContent = t("viewRequest");
      popup.append(text, link);
      api
        .marker([p.lat, p.lng], {
          title: p.label,
          alt: p.label,
          icon: api.divIcon({
            className: "carecall-map-pin",
            html:
              '<span style="background:' +
              color +
              '">' +
              (p.accepted ? "✓" : i + 1) +
              "</span>",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        })
        .addTo(markers)
        .bindPopup(popup);
    });
    if (items.some((p) => p.accepted) && !radius)
      map.fitBounds(
        api.latLngBounds([
          [lat, lng],
          ...items.map((p) => [p.lat, p.lng] as [number, number]),
        ]),
        { padding: [40, 40], maxZoom: 16, animate: false },
      );
    return () => {
      markers.clearLayers();
    };
  }, [context, pointsKey, lat, lng, radius, t]);
  useEffect(() => {
    if (!context || context.map !== activeMap.current) return;
    context.lines.clearLayers();
    const coords = JSON.parse(routeKey) as number[][];
    if (coords.length) {
      const line = context.api
        .polyline(
          coords.map((c) => [c[1], c[0]] as [number, number]),
          { color: "#2563eb", weight: 5 },
        )
        .addTo(context.lines);
      context.map.fitBounds(line.getBounds(), {
        padding: [28, 28],
        maxZoom: 16,
        animate: false,
      });
    }
    return () => {
      context.lines.clearLayers();
    };
  }, [context, routeKey]);
  useEffect(() => {
    if (!context || context.map !== activeMap.current) return;
    const { map, position, accuracy } = context;
    if (!livePosition) {
      position.remove();
      accuracy.remove();
      return;
    }
    const point: [number, number] = [livePosition.lat, livePosition.lng];
    const color = positionStale ? "#78716c" : "#2563eb";
    accuracy.setLatLng(point).setRadius(livePosition.accuracy).setStyle({ color }).addTo(map);
    position.setLatLng(point).setStyle({ fillColor: color }).addTo(map);
    position.bindTooltip(t(positionStale ? "lastKnownLocation" : "yourLiveLocation"));
    if (followPosition && !positionStale) map.panTo(point, { animate: false });
  }, [context, livePosition, positionStale, followPosition, t]);
  return (
    <section
      className={
        "location-map overflow-hidden rounded-3xl border border-line bg-surface " +
        (compact ? "compact-map" : "")
      }
      aria-label={title || t("location")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
        <h2 className="text-lg font-semibold">{title || t("location")}</h2>
        <button
          type="button"
          className="min-h-11 text-sm underline"
          onClick={() => setAttempt((a) => a + 1)}
        >
          {t("recenter")}
        </button>
      </div>
      <div
        ref={container}
        className={"relative z-0 w-full " + (compact ? "h-32" : "h-80")}
        aria-label={title || t("location")}
      />
      {!compact && (
        <p className="px-5 py-3 text-sm">
          {legend || t(onPick ? "pickLocationHint" : "mapLegend")}
        </p>
      )}
      {error && (
        <div role="status" className="px-5 pb-3 text-sm text-danger">
          {t("mapError")}{" "}
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => setAttempt((a) => a + 1)}
          >
            {t("retry")}
          </button>
        </div>
      )}
    </section>
  );
}
