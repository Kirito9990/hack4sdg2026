"use client";

import LocationMap from "./location-map";
import { useApp } from "./providers";
type Point = { lat: number; lng: number };
export default function LocationPicker({
  coords,
  locating,
  error,
  onLocate,
  onPick,
  compact = false,
}: {
  coords: Point | null;
  locating: boolean;
  error: string;
  onLocate: () => void;
  onPick: (p: Point) => void;
  compact?: boolean;
}) {
  const { t } = useApp();
  const centre = coords || { lat: 22.3193, lng: 114.1694 };
  return (
    <section className="location-picker" aria-label={t("requestLocation")}>
      <div className="location-controls">
        <span className="text-sm">
          {t(coords ? "locationReady" : "chooseLocation")}
        </span>
        <button
          type="button"
          className="button secondary"
          disabled={locating}
          onClick={onLocate}
        >
          {t(locating ? "findingLocation" : "useMyLocation")}
        </button>
      </div>
      {error && (
        <p className="location-error" role="alert">
          {t(error)}
        </p>
      )}
      <LocationMap
        {...centre}
        title={t("requestLocation")}
        compact={compact}
        onPick={onPick}
        showPosition={!!coords}
      />
      <p className="text-xs text-muted">{t("pickLocationHint")}</p>
    </section>
  );
}
