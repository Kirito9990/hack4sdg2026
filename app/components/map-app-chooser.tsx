"use client";

import { useEffect, useRef, useState } from "react";
import { mapApps, mapAppLinks, mapPlatform, type Coordinates, type MapPlatform, type MapProvider } from "@/lib/navigation";
import { scheduleMapStoreFallback } from "@/lib/map-app-handoff";
import { useApp } from "./providers";

export default function MapAppChooser({ destination }: { destination: Coordinates }) {
  const { t, locale } = useApp();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelHandoff = useRef<(() => void) | undefined>(undefined);
  const [platform, setPlatform] = useState<MapPlatform>("web");
  const [closing, setClosing] = useState(false);
  useEffect(() => () => { clearTimeout(timer.current); cancelHandoff.current?.(); }, [destination.lat, destination.lng]);
  function dismiss() {
    cancelHandoff.current?.();
    if (closing) return;
    setClosing(true);
    timer.current = setTimeout(() => {
      dialog.current?.close();
      setClosing(false);
      trigger.current?.focus();
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180);
  }
  return <>
    <button ref={trigger} type="button" className="button navigation-start" aria-haspopup="dialog" onClick={() => {
      clearTimeout(timer.current);
      cancelHandoff.current?.();
      setClosing(false);
      setPlatform(mapPlatform(navigator.userAgent, navigator.maxTouchPoints));
      dialog.current?.showModal();
    }}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m21 3-7 18-3-8-8-3L21 3Z" strokeLinejoin="round" /></svg>{t("startNavigation")}</button>
    <dialog ref={dialog} className="map-app-sheet" data-closing={closing} aria-labelledby="map-chooser-title" aria-describedby="map-chooser-hint"
      onClose={() => cancelHandoff.current?.()}
      onCancel={e => { e.preventDefault(); dismiss(); }}
      onKeyDown={e => {
        if (e.key !== "Tab") return;
        const items = e.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }}
      onClick={e => { if (e.target === e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dismiss();
      } }}>
      <div className="sheet-handle" aria-hidden="true" />
      <h2 id="map-chooser-title">{t("chooseMapApp")}</h2>
      <p id="map-chooser-hint" className="sheet-hint">{t(platform === "web" ? "mapChooserDesktop" : "mapChooserHint")}</p>
      <div className="map-app-list">
        {(Object.keys(mapApps) as MapProvider[]).filter(provider => platform !== "android" || provider !== "apple").map(provider => {
          const app = mapApps[provider], links = mapAppLinks(provider, destination, platform);
          const store = platform === "android" ? links.androidStore : links.iosStore;
          const name = t(`mapProvider_${provider}`);
          const identity = <><span className="map-app-badge" aria-hidden="true">{locale === "en" ? provider[0].toUpperCase() : app.badge}</span><span className="map-app-name">{name}</span></>;
          if (links.open && store) return <a key={provider} href={links.open} className="map-app-row map-app-launch" aria-label={name} referrerPolicy="no-referrer" rel="noreferrer" onClick={e => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            cancelHandoff.current?.();
            cancelHandoff.current = scheduleMapStoreFallback(() => window.location.assign(store));
          }}>{identity}<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></a>;
          return <div className="map-app-row" key={provider}>
            {identity}
            <div className="map-app-actions">
              <a href={links.iosStore} className="map-app-install" aria-label={`${name} · App Store`} referrerPolicy="no-referrer" rel="noreferrer">App Store</a>
              {links.androidStore && <a href={links.androidStore} className="map-app-install" aria-label={`${name} · ${t("androidStore")}`} referrerPolicy="no-referrer" rel="noreferrer">{t("androidStore")}</a>}
            </div>
          </div>;
        })}
      </div>
      <button type="button" className="sheet-cancel" onClick={dismiss}>{t("cancel")}</button>
    </dialog>
  </>;
}
