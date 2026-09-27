import { test } from "node:test";
import assert from "node:assert/strict";
import { navigationLinks, mapPlatform, mapAppLinks } from "../lib/navigation.ts";

const destination = { lat: 22.3193, lng: 114.1694 };
test("all mobile providers preserve the selected travel mode and GPS coordinate system", () => {
  for (const platform of ["ios", "android"]) for (const mode of ["transit", "walking", "driving"]) {
    const google = new URL(navigationLinks("google", mode, destination, platform).href);
    assert.equal(google.searchParams.get("destination"), "22.3193,114.1694");
    assert.equal(google.searchParams.get("travelmode"), mode);
    assert.equal(google.searchParams.has("origin"), false);
    assert.equal(google.searchParams.has("dir_action"), mode !== "transit");
    const apple = new URL(navigationLinks("apple", mode, destination, platform).href);
    assert.equal(apple.searchParams.get("daddr"), "22.3193,114.1694");
    assert.equal(apple.searchParams.get("dirflg"), { transit: "r", walking: "w", driving: "d" }[mode]);
    assert.equal(apple.searchParams.has("saddr"), false);
    const amap = new URL(navigationLinks("amap", mode, destination, platform).href);
    assert.equal(amap.protocol, platform === "ios" ? "iosamap:" : "amapuri:");
    assert.equal(amap.searchParams.get("dlat"), "22.3193");
    assert.equal(amap.searchParams.get("dlon"), "114.1694");
    assert.equal(amap.searchParams.get("dev"), "1");
    assert.equal(amap.searchParams.get("t"), { transit: "1", walking: "2", driving: "0" }[mode]);
    const baidu = new URL(navigationLinks("baidu", mode, destination, platform).href);
    assert.equal(baidu.protocol, platform === "ios" ? "baidumap:" : "bdapp:");
    assert.equal(baidu.searchParams.get("destination"), "22.3193,114.1694");
    assert.equal(baidu.searchParams.get("coord_type"), "wgs84");
    assert.equal(baidu.searchParams.get("mode"), mode);
    assert.equal(baidu.searchParams.get("origin"), "我的位置");
  }
});
test("mainland-provider browser fallbacks preserve WGS84 and correctly identify destination-only links", () => {
  for (const provider of ["amap", "baidu"]) {
    const desktop = navigationLinks(provider, "walking", destination, "web");
    assert.equal(desktop.destinationOnly, true);
    assert.equal(desktop.href, desktop.webHref);
    const u = new URL(desktop.href);
    assert.equal(u.protocol, "https:");
    assert.equal(u.searchParams.get(provider === "amap" ? "coordinate" : "coord_type"), "wgs84");
    assert.equal(u.searchParams.get(provider === "amap" ? "position" : "location"), provider === "amap" ? "114.1694,22.3193" : "22.3193,114.1694");
  }
});
test("links exclude private request fields and reject corrupt destinations", () => {
  const privateRequest = { ...destination, residentName: "Private person", residentAddress: "Private flat", id: "private-id" };
  for (const provider of ["google", "apple", "amap", "baidu"]) {
    assert(!JSON.stringify(navigationLinks(provider, "transit", privateRequest, "ios")).includes("Private"));
    assert.throws(() => navigationLinks(provider, "walking", { lat: NaN, lng: 114 }, "web"));
    assert.throws(() => navigationLinks(provider, "walking", { lat: 91, lng: 114 }, "web"));
  }
});
test("platform selection handles iPad desktop user agents", () => {
  assert.equal(mapPlatform("Mozilla iPhone"), "ios");
  assert.equal(mapPlatform("Mozilla Macintosh", 5), "ios");
  assert.equal(mapPlatform("Mozilla Macintosh", 0), "web");
  assert.equal(mapPlatform("Mozilla Android"), "android");
  assert.equal(mapPlatform("Mozilla Windows"), "web");
});

test("Android app intents target the correct package with direct store fallbacks", () => {
  for (const [provider, pkg] of [["google", "com.google.android.apps.maps"], ["amap", "com.autonavi.minimap"], ["baidu", "com.baidu.BaiduMap"]]) {
    const links = mapAppLinks(provider, destination, "android");
    assert(links.open.startsWith("intent://"));
    assert(links.open.includes(`package=${pkg};`));
    assert(links.open.includes(`S.browser_fallback_url=${encodeURIComponent(links.androidStore)};end`));
    assert(!links.androidStore.includes("22.3193"));
    assert.equal(new URL(links.androidStore).hostname, provider === "google" ? "play.google.com" : "sj.qq.com");
  }
  assert.equal(mapAppLinks("apple", destination, "android").open, null);
  assert.equal(mapAppLinks("apple", destination, "android").androidStore, null);
});
test("iOS chooser pairs native app schemes with their App Store fallback", () => {
  for (const [provider, id] of [["google", "585027354"], ["apple", "915056765"], ["amap", "461703208"], ["baidu", "452186370"]]) {
    const links = mapAppLinks(provider, destination, "ios");
    assert(links.open);
    assert.equal(links.iosStore, `https://apps.apple.com/app/id${id}`);
  }
  assert.equal(new URL(mapAppLinks("google", destination, "ios").open).protocol, "comgooglemaps:");
  assert.equal(new URL(mapAppLinks("apple", destination, "ios").open).protocol, "maps:");
  assert.equal(new URL(mapAppLinks("google", destination, "ios").open).searchParams.get("daddr"), "22.3193,114.1694");
});
test("desktop offers store listings instead of unsupported native launches", () => {
  for (const provider of ["google", "apple", "amap", "baidu"]) assert.equal(mapAppLinks(provider, destination, "web").open, null);
});
