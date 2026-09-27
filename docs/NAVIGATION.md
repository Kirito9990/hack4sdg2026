# Volunteer navigation

The accepted volunteer task's Map tab shows the destination and a persistent **Start navigation / 開始導航 / 开始导航** button. It opens an animated modal bottom sheet with Google Maps, Apple Maps, AMap and Baidu Maps. Names follow the selected UI language, including 高德地圖 / 百度地圖 in Traditional Chinese and 高德地图 / 百度地图 in Simplified Chinese. The map remains in its panel; there is no full-screen map transition. Route plans, travel-mode selection and ETAs are deferred to the external app. No map credentials are required.

The sheet slides up over a fading backdrop, slides down on dismissal, and respects reduced-motion preferences. Cancel, Escape and outside-tap close it and restore focus. Keyboard focus stays inside the modal. Completing the task removes the chooser and stops location tracking. The existing cream/brown palette is preserved.

## Opening and installing apps

- **iPhone/iPad:** tap anywhere on an app row to attempt its native URL scheme, then fall back to that app's App Store listing if CareCall remains visible and focused. No separate Open/Install choices. Apple uses the `maps:` scheme; Google, AMap and Baidu use their own schemes.
- **Android:** one tap on Google Maps, AMap or Baidu Maps invokes an intent explicitly targeting its package with a direct store fallback. Google uses Google Play; AMap and Baidu use 应用宝 for mainland availability. Apple Maps is omitted because it has no Android app.
- **Desktop:** the sheet offers App Store and Android store links, with a prompt to navigate on a phone. It does not attempt unsupported native launches.

The guarded browser fallback waits 2.5 seconds in the foreground. Hiding/leaving the page permanently cancels that attempt. Blur pauses it for a system prompt; focus permits a fresh grace period within a 15-second window. Late timers are discarded. Dismissal, a different app selection, destination change, and unmount cancel any pending fallback. Android Chrome also performs its own native intent fallback. A website cannot reliably query arbitrary installed iOS apps: the timer is a best-effort launch-failure heuristic, not installation detection. Browsers can show confirmation/error dialogs or block app/store handoffs; a slow launch without visibility events can still fall back. These behaviors require physical-device checks, especially Safari and embedded browsers.

Stores receive no resident coordinates. Native direction links receive only the destination, with public transport as the initial mode; volunteers can choose walking or another mode in the map app. Resident names, address text, phone numbers, request IDs and chat content are excluded. Coordinate handling remains WGS84: Amap uses dev=1 and Baidu uses coord_type=wgs84. CareCall does not receive journey progress from the external app.

Reference documentation: [Android intent fallbacks](https://developer.chrome.com/docs/android/intents), [Google iOS app links](https://developers.google.com/maps/documentation/urls/ios-urlscheme), [Apple Maps links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html), [Amap Android](https://lbs.amap.com/api/amap-mobile/guide/android/route), [Amap iOS](https://lbs.amap.com/api/amap-mobile/guide/ios/route), [Baidu Android](https://lbs.baidu.com/docs/webapi?title=mapadjustment/uri/andriod), [Baidu iOS](https://lbs.baidu.com/docs/webapi?title=mapadjustment/uri/ios).

Apple's current [Maps scheme guidance](https://developer.apple.com/documentation/carplay/cpcontactdirectionsbutton) refers to `maps:`; older HTTPS Map Links remain in the general-purpose `navigationLinks` helper. The mobile chooser specifically needs an app-first scheme so a web-map page does not replace the store fallback.

Verified store listings: [Google Play](https://play.google.com/store/apps/details?id=com.google.android.apps.maps), [高德 on 应用宝](https://sj.qq.com/appdetail/com.autonavi.minimap), [百度 on 应用宝](https://sj.qq.com/appdetail/com.baidu.BaiduMap), App Store IDs Google 585027354 / Apple 915056765 / 高德 461703208 / 百度 452186370. Availability and app-launch behavior depend on device, browser, store region and installed app versions; embedded browsers may require opening CareCall in the phone's browser.

## Live foreground map

The volunteer explicitly starts location updates. `watchPosition` updates the same Leaflet marker and accuracy circle without rebuilding the map on each fix. Panning turns off following; the volunteer can restore it. A stale reading (over 30 seconds), errors and background state cannot display as a fresh location. Returning to the foreground requires a fresh fix. Pending permission is bounded by a 15-second UI deadline, and directions remain accessible after denial or failure.

Watches stop when the page is hidden, the map tab is left, the task finishes, permission is denied, or the volunteer stops updates. Resuming the visible page restarts only an already enabled session. Positions stay in component memory, not local storage or the CareCall server. Basemap tiles still come from OpenStreetMap as before. The old driving endpoint is retained for compatibility but is no longer called by the volunteer navigation UI.

## Validation

- `node --test tests/navigation.test.mjs tests/map-app-handoff.test.mjs` (Node with TypeScript stripping, e.g. Node 24), including failed launch, successful departure/return, prompt timing, late timers and cancellation.
- `node --test tests/navigation-ui.test.mjs` against an isolated local test server. Requires Playwright (or its location in NODE_PATH); tests create and delete synthetic accounts. Set `CARECALL_TEST_URL` to its loopback URL. Set `CARECALL_SCREENSHOT_DIR` to save screenshots and additionally require real tile loading.
- Existing UI regression: `node --test tests/ui-regression.test.mjs`.
- `node node_modules/eslint/bin/eslint.js` and `node node_modules/next/dist/bin/next build`.

Native app launches and exact Hong Kong transit results still require physical iPhone/Android smoke tests with each app installed and absent. Browser tests inspect outgoing links, prevent native app launches, and locally intercept store navigation. They also verify all three name translations and cancellation on closing/returning from an app.
