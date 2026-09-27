export type TravelMode = "transit" | "walking" | "driving";
export type MapProvider = "google" | "apple" | "amap" | "baidu";
export type MapPlatform = "ios" | "android" | "web";
export type Coordinates = { lat: number; lng: number };

export const mapApps = {
  apple: { badge: "A", iosId: "915056765", androidPackage: "" },
  google: { badge: "G", iosId: "585027354", androidPackage: "com.google.android.apps.maps" },
  amap: { badge: "高", iosId: "461703208", androidPackage: "com.autonavi.minimap" },
  baidu: { badge: "百", iosId: "452186370", androidPackage: "com.baidu.BaiduMap" },
} as const;

export function mapAppLinks(provider: MapProvider, destination: Coordinates, platform: MapPlatform) {
  const app = mapApps[provider];
  const iosStore = `https://apps.apple.com/app/id${app.iosId}`;
  const androidStore = !app.androidPackage ? null : provider === "google"
    ? `https://play.google.com/store/apps/details?id=${app.androidPackage}`
    : `https://sj.qq.com/appdetail/${app.androidPackage}`;
  const route = navigationLinks(provider, "transit", destination, platform);
  if (platform === "web" || (platform === "android" && provider === "apple")) {
    return { open: null, iosStore, androidStore };
  }
  if (platform === "ios") {
    const open = provider === "google"
      ? url("comgooglemaps://", { daddr: `${destination.lat},${destination.lng}`, directionsmode: "transit" })
      : provider === "apple" ? route.href.replace("https://maps.apple.com/", "maps://") : route.href;
    return { open, iosStore, androidStore };
  }
  // Chrome resolves the installed package or goes straight to this app's store
  // listing, without asking the volunteer to choose Open versus Install.
  const native = provider === "baidu" ? route.href.replace("bdapp:", "baidumap:") : route.href;
  const [scheme, path] = native.split("://");
  const open = `intent://${path}#Intent;scheme=${scheme};package=${app.androidPackage};S.browser_fallback_url=${encodeURIComponent(androidStore!)};end`;
  return { open, iosStore, androidStore };
}

export function mapPlatform(userAgent: string, touchPoints = 0): MapPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1)) return "ios";
  return /Android|HarmonyOS/i.test(userAgent) ? "android" : "web";
}

function url(base: string, params: Record<string, string>) {
  return base + "?" + new URLSearchParams(params).toString();
}

// CareCall stores WGS84 coordinates (browser GPS / OpenStreetMap). Let the
// provider do its own conversion: Amap dev=1 / coordinate=wgs84, Baidu coord_type=wgs84.
// Never send a resident's name, unit, phone, request ID or conversation to a map app.
export function navigationLinks(provider: MapProvider, mode: TravelMode, destination: Coordinates, platform: MapPlatform) {
  if (!Number.isFinite(destination.lat) || !Number.isFinite(destination.lng) || Math.abs(destination.lat) > 90 || Math.abs(destination.lng) > 180) {
    throw new Error("Invalid destination");
  }
  const lat = String(destination.lat), lng = String(destination.lng);
  if (provider === "google") {
    const href = url("https://www.google.com/maps/dir/", {
      api: "1", destination: `${lat},${lng}`, travelmode: mode,
      ...(mode !== "transit" ? { dir_action: "navigate" } : {}),
    });
    return { href, webHref: href, destinationOnly: false };
  }
  if (provider === "apple") {
    // Legacy HTTPS Map Links also work on iPhones predating unified Maps URLs.
    const href = url("https://maps.apple.com/", {
      daddr: `${lat},${lng}`, dirflg: { transit: "r", walking: "w", driving: "d" }[mode],
    });
    return { href, webHref: href, destinationOnly: false };
  }
  if (provider === "amap") {
    // The web routing URI does not document WGS84 input. Use the documented
    // WGS84 marker as the web fallback rather than introducing a shifted pin.
    const webHref = url("https://uri.amap.com/marker", {
      position: `${lng},${lat}`, name: "目的地", coordinate: "wgs84", src: "CareCall", callnative: "0",
    });
    const href = url(platform === "ios" ? "iosamap://path" : "amapuri://route/plan/", {
      sourceApplication: "CareCall", dlat: lat, dlon: lng, dev: "1",
      t: { transit: "1", walking: "2", driving: "0" }[mode], m: "0",
    });
    return { href: platform === "web" ? webHref : href, webHref, destinationOnly: platform === "web" };
  }
  const webHref = url("https://api.map.baidu.com/marker", {
    location: `${lat},${lng}`, title: "目的地", content: "目的地",
    coord_type: "wgs84", output: "html", src: "webapp.carecall.CareCall",
  });
  // The web direction endpoint requires an origin; use a destination fallback
  // instead of inventing an origin or reusing a stale matching location.
  const href = url(platform === "ios" ? "baidumap://map/direction" : "bdapp://map/direction", {
    origin: "我的位置", destination: `${lat},${lng}`, mode, coord_type: "wgs84",
    src: platform === "ios" ? "ios.carecall.CareCall" : "andr.carecall.CareCall",
  });
  return { href: platform === "web" ? webHref : href, webHref, destinationOnly: platform === "web" };
}
