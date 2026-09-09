# Spike: one Qt-for-WebAssembly QML runtime inside WKWebView / Android WebView

Date: 2026-09-09. Gates ADR 0004 ("Web container UI is QML on a bundled Qt-wasm runtime").
Repo: `~/Repos/agents/spike-qtwasm-webview` (nothing pushed).

## Verdict: feasible-with-caveats

A single bundled Qt 6.11.1 wasm runtime (26.3 MB, single-threaded) loaded from the app
bundle renders Qt Quick + Logos.Controls with the Logos look inside WKWebView (iPhone 16 Pro
simulator iOS 18.2, iPad Air 4 iPadOS 26.5.2) and Android WebView (Samsung SM-G990B,
Android 16, WebView 152), fetches and instantiates a QML document at runtime that imports
the bundled design system, takes the on-screen keyboard into a `LogosTextField`, and flick-
scrolls a 500-row `LogosListView`. No WebKit- or Chromium-specific breakage was hit.

Caveats that shape the design:

1. **Payload and memory.** 26.3 MB wasm raw (9.6 MB gzip, 6.8 MB brotli); WebContent /
   renderer process ~215-240 MB (iOS simulator footprint), ~185-207 MB PSS renderer + ~140-155
   MB PSS app process (Android). wasm linear memory 50 MB idle, 60 MB with 200+ controls.
2. **Cold start 2.6 s on the A14 iPad, 3.0 s on the S21 FE** (process start to first Qt
   frame); 1.3 s / 1.9-2.1 s warm. wasm compile itself is 170-280 ms; the rest is Qt/QML init.
3. **Custom scheme and Qt's network stack do not meet.** `QNetworkAccessManager` on wasm only
   creates requests for `http`/`https`/relative URLs, so `Loader.source = "qtapp://..."` fails
   with `Network error`. Runtime QML from the bundle needs either (a) a loopback http server
   (works, and is the only way to get `crossOriginIsolated`) or (b) JS `fetch` + `Qt.createQmlObject`
   with a qrc base URL (works, but relative sibling imports must be resolved by hand). On
   Android, `WebViewAssetLoader` is an https origin, so Qt's own path works out of the box.
4. **No threads via the custom scheme.** COOP/COEP headers on `WKURLSchemeHandler` responses
   do not produce `crossOriginIsolated`. Serving from `http://127.0.0.1` with those headers
   does: `crossOriginIsolated=true`, `SharedArrayBuffer` defined on both iOS and iPadOS 26.5.
   Android WebView stays `false` with the same headers (matches the open Chromium bug).
5. `file://` is dead on both platforms (fetch of the wasm fails).

## Measurements

| Measurement | iPhone 16 Pro sim (iOS 18.2, M-series host) | iPad Air 4 (A14, iPadOS 26.5.2) | Samsung SM-G990B (Android 16, WebView 152.0.7977.64) |
|---|---|---|---|
| Load path that works | `WKURLSchemeHandler` (`qtapp://app/`), loopback `http://127.0.0.1:<port>`, LAN http | same | `WebViewAssetLoader` (`https://appassets.androidplatform.net/`), LAN http |
| `file://` | fails: fetch returns status 0, no MIME; streaming and ArrayBuffer paths both abort | same | fails: `Fetch API cannot load file:///android_asset/spike.wasm. URL scheme "file" is not supported.` |
| WebGL2 in webview | yes (`Apple GPU / WebGL 2.0`) | yes (`Apple GPU / WebGL 2.0`) | yes (`Adreno (TM) 660 / WebGL 2.0 (OpenGL ES 3.0 Chromium)`) |
| Cold start, process start to first Qt frame | 4.07 s first launch after install; 1.34-1.43 s warm (one outlier 5.9 s right after reinstall) | 2.59 s cold (first launch after install); 1.28-1.65 s warm | 3.01 s cold; 1.89-2.06 s warm; 2.63 s from LAN http |
| of which wasm `instantiateStreaming` | 116-171 ms | 168-277 ms | 144-218 ms (953 ms over LAN http) |
| wasm read from bundle (26.3 MB) | 7-13 ms via scheme handler | 42-46 ms | 5-18 ms |
| WebContent / renderer memory, runtime idle | 214-216 MB phys footprint (`footprint`, simulator process; proxy only) | not measurable (Instruments refuses network-paired device; see below) | renderer PSS 185.0 MB + app process PSS 140.7 MB |
| same, Controls-heavy page (60 rows TextField+Button+Switch+Checkbox, 30 rows Slider+ComboBox+SpinBox, plus 500-row list) | 237-239 MB | not measurable | renderer PSS 206.6 MB + app process PSS 154.0 MB |
| wasm linear memory (`emscripten_get_heap_size`) | 50 MB idle, 60 MB heavy | 50 MB idle, 60 MB heavy | 50 MB idle, 60 MB heavy |
| On-screen keyboard into `LogosTextField` | tap on field: `UIKeyboardWillShow/DidShow` fired (frame h=119, hardware keyboard attached); typed text via QML arrives | tap on field: `UIKeyboardWillShow/DidShow` fired, frame (0,843,820,337); `WillHide` on leaving the tab | real `adb input tap` opens IME (height 894 px); `adb input text` delivers each character into the QML field; IME hides on Back |
| Touch scrolling in `ListView` | pointer flick: `flickStarted` v=1405, contentY 8000 -> 8858 | flick v=1205, 8000 -> 8651 | real `adb input swipe`: flick v=1874, 8190 -> 9716 |
| `crossOriginIsolated` / `SharedArrayBuffer` | scheme: false/undefined even with COOP+COEP; loopback+COOP/COEP: **true/function**; LAN http: false, `isSecureContext=false` | same (loopback+COOP/COEP true on iPadOS 26.5) | false/undefined with or without COOP/COEP on the asset-loader https origin |
| Remote QML via `Loader.source` (Qt network) | scheme: `Network error`; loopback http and LAN http: OK | same | OK (asset loader is https); also OK from LAN http |
| Remote QML via JS `fetch` + `Qt.createQmlObject` | OK from scheme, loopback, LAN | OK | OK |
| Console errors during a good run | none besides the expected `Network error` for the scheme URL | none | none besides a `favicon.ico` 404 and the `remote/qmldir` 404 probe |
| WebContent process terminated / renderer gone | never | never | never |

Sizes: `spike.wasm` 26,317,972 B raw, 9,643,110 B gzip -9, 6,788,136 B brotli -q 11;
`spike.js` 260 KB; `qtloader.js` 12 KB. Android APK 27.6 MB (wasm stored uncompressed).

Cold-start breakdown, iPad cold run (`runs/ipad-scheme-cold.log`), ms after process start:
viewDidLoad 155, page script running 1117, wasm fetched 1289, instantiated 1519, `qt_onLoaded`
1537, `main()` 1583, root QML `Component.onCompleted` 1903, `objectCreated` 2583, first
`frameSwapped` 2591. Roughly 1.1 s of that is WKWebView/WebContent bring-up before any of our
bytes run, 0.3 s wasm compile, 1.0 s Qt + QML engine init and first render.

Not measured: memory of the WebContent process on the iPad. `xctrace record --template
'Activity Monitor' --device 00008101-000474143446001E` fails with
`[Error] Connecting to Ipad air Elena (26.5.2). Cannot record until the device is connected.`
(the iPad is network-paired, no USB). The simulator footprint and the Android renderer PSS
bracket it; the wasm heap is identical on all three.

## Load path that worked, exact code

iOS, `ios/Sources/SchemeHandler.swift` (`WKURLSchemeHandler` for `qtapp://app/<path>` ->
`SpikeHost.app/www/<path>`):

```swift
var headers: [String: String] = [
    "Content-Type": SpikeSchemeHandler.mime(for: file.pathExtension),   // "wasm" -> "application/wasm"
    "Content-Length": String(data.count),
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
]
if isolate {   // has no effect on crossOriginIsolated under a custom scheme
    headers["Cross-Origin-Opener-Policy"] = "same-origin"
    headers["Cross-Origin-Embedder-Policy"] = "require-corp"
    headers["Cross-Origin-Resource-Policy"] = "cross-origin"
}
let resp = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
task.didReceive(resp); task.didReceive(data); task.didFinish()
```

registered in `ios/Sources/ViewController.swift`:

```swift
cfg.setURLSchemeHandler(SpikeSchemeHandler(root: www, isolate: isolate), forURLScheme: "qtapp")
...
webView.load(URLRequest(url: URL(string: "qtapp://app/index.html")!))
```

The loopback alternative (`ios/Sources/LoopbackServer.swift`) is an `NWListener` on
`127.0.0.1` with `requiredInterfaceType = .loopback`, serving the same directory with the
same headers; with COOP/COEP it is the path that yields `crossOriginIsolated == true`.

Android, `android/app/src/main/java/co/logos/spike/qtwasm/MainActivity.java`:

```java
final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
        .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
web.setWebViewClient(new WebViewClient() {
    @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
        WebResourceResponse r = loader.shouldInterceptRequest(req.getUrl());
        if (r == null) return null;
        String path = req.getUrl().getPath();
        if (path.endsWith(".wasm")) r.setMimeType("application/wasm");
        else if (path.endsWith(".qml")) r.setMimeType("text/plain");
        ... headers (ACAO, no-store, optional COOP/COEP) ...
        return r;
    }
});
web.loadUrl("https://appassets.androidplatform.net/index.html");
```

`AssetsPathHandler` does not know the `.wasm` MIME type on its own; without the override
`instantiateStreaming` would fall back to ArrayBuffer instantiation. `.wasm` is added to
`noCompress` so the asset is a plain file inside the APK.

Page side (`app/www/index.html`) uses Qt's stock `qtloader.js` unchanged:
`qtLoad({ qt: { entryFunction: window.spike_entry, containerElements: [screen], ... } })`.

## Console errors, verbatim

Expected, custom scheme + `Loader.source`: `qtapp://app/remote/RemotePage.qml: Network error`
(emitted as a `QQmlApplicationEngine::warnings` entry and as `console.warn`).

`file://`, WKWebView (simulator and iPad, identical):

```
wasm streaming compile failed: TypeError: Unexpected response MIME type. Expected 'application/wasm'
falling back to ArrayBuffer instantiation
failed to asynchronously prepare wasm: both async and sync fetching of the wasm failed
Aborted(both async and sync fetching of the wasm failed)
```

(`fetch("spike.wasm")` on a `file://` page resolves with status 0 and no headers in WebKit.)

`file:///android_asset/`, Android WebView:

```
Fetch API cannot load file:///android_asset/spike.wasm. URL scheme "file" is not supported.
wasm streaming compile failed: TypeError: Failed to fetch
failed to asynchronously prepare wasm: both async and sync fetching of the wasm failed
Uncaught (in promise) RuntimeError: Aborted(both async and sync fetching of the wasm failed). Build with -sASSERTIONS for more info.
```

First attempt only (fixed): `TypeError: window.qtInstance.ccall is not a function` because
Qt's link line overrides `EXPORTED_RUNTIME_METHODS`; the bridge now uses embind
(`EMSCRIPTEN_BINDINGS`) which Qt already links. And `Qt.createQmlObject(text, parent,
"qtapp://app/remote/RemotePage.qml")` fails with `Failed to force synchronous loading of
asynchronous URL` because the engine probes the document's implicit directory import
(`<dir>/qmldir`) through QNetworkAccessManager; passing a `qrc:/remote/<name>` base URL fixes
it (Android showed the same probe as a harmless `remote/qmldir` 404 on the https origin).

No QML warnings from the design system (fonts, icons, singletons all resolved; Public Sans
renders, see `shots/android-form-keyboard.png`).

## Keyboard and touch behaviour

- Qt 6.11 wasm renders into a canvas inside `#screen > div#qt-shadow-container > div.qt-window`
  (no shadow root, contrary to older Qt). Pointer events on `div.qt-window` are consumed by Qt.
- iOS: a tap (synthetic `PointerEvent`, `pointerType: touch`, on the field) makes Qt focus the
  `TextInput`, and WebKit then raises the native keyboard (`UIKeyboardWillShowNotification`
  with a 337 px frame on the iPad). Leaving the tab hides it. The web view was pinned to the
  safe area; nothing else was needed. Typing through the iOS keyboard itself was not driven
  end to end (no input injection available for the simulator/device from this shell); the
  QML field accepted programmatic text and re-rendered correctly.
- Android: real `adb shell input tap` on the field opens the IME; `adb shell input text` is
  delivered character by character to the QML `TextInput` (19 `textChanged` events for a
  19-char string); Back hides the IME. With `adjustResize` + edge-to-edge (targetSdk 35) the
  page is not resized, the IME overlaps the bottom of the canvas; acceptable for a spike, a
  real host must apply the IME inset to the WebView.
- ListView flicks: synthetic pointer drags on iOS and a real `adb input swipe` on Android both
  produce `flickStarted` with plausible velocities and a decelerating movement; no jank visible
  in screenshots. The host web view's own scrolling is disabled so gestures reach the canvas.
- Interaction latency subjectively fine on the S21 FE: events are echoed within 5-20 ms of the
  injected input in the logs.

## Remote QML result

`app/remote/RemotePage.qml` (a `LogosFrame` with `LogosText`, `LogosButton`, `LogosSwitch`,
`LogosTextField`, importing `Logos.Theme` and `Logos.Controls`) shipped only as text under
`www/remote/` and served at runtime:

| Path | iOS | Android |
|---|---|---|
| `Loader.source = <custom scheme URL>` | `Network error` (QNAM wasm backend only handles http/https/relative) | n/a (asset loader is https): **OK** |
| `Loader.source = http://127.0.0.1:<port>/remote/RemotePage.qml` (loopback in-app server) | **OK**, `Component.onCompleted` 25-30 ms after request | not tried (https origin already works) |
| `Loader.source = http://<LAN>/remote/RemotePage.qml` (external server, CORS `*`) | **OK** | **OK** |
| JS `fetch(url)` -> `Qt.createQmlObject(text, parent, "qrc:/remote/RemotePage.qml")` | **OK** from scheme/loopback/LAN | **OK** |

The remotely loaded document uses the statically linked design system types, so the Canonic
model of "runtime binary carries the type set, modules ship QML/JS text" holds. Caveat: with
the qrc-base trick, relative imports/siblings in the fetched document would resolve against
`qrc:`, so a production host should give QML a real http origin for module content (loopback
server, or an app-controlled `https://` origin via a scheme handler that Qt sees as http; see
recommendation) or install a `QQmlAbstractUrlInterceptor` + custom `QNetworkAccessManager`
that speaks the custom scheme via `fetch`.

## Recommendation

Keep QML-on-Qt-wasm as the primary Web-container UI, with these conditions written into ADR 0004:

1. **Serve the runtime and module content from an in-app loopback HTTP server on iOS**, not
   from a custom scheme. It is the only path where Qt's own network layer works for module
   QML, and it is the only path where `crossOriginIsolated` becomes true (leaving a future
   multi-threaded build open). `WKURLSchemeHandler` remains a fine fallback for the static
   runtime bytes. On Android, `WebViewAssetLoader` already provides an https origin; threads
   stay off there regardless (`crossOriginIsolated` never true).
2. **Single-threaded build, ship brotli-compressed wasm and let the loopback server send it
   with `Content-Encoding: br`** if bundle size matters (26 MB raw vs 6.8 MB); on-device read
   time is negligible either way, compile is 0.2-0.3 s.
3. **Budget ~2.5-3 s cold / ~1.3-2 s warm to first frame and ~200-250 MB for the web
   content process** per live runtime. One runtime per app, not per module: a second
   instance doubles that. Module-heavy pages add ~20 MB.
4. Fix the two host-side details before the first real module: apply IME insets on Android
   (edge-to-edge), and keep the host web view non-scrollable so gestures reach the canvas.
5. Revisit HTML/JS-primary only if the memory budget is rejected; nothing functional argued
   for it in this spike.

## What was used

- Qt 6.11.1 `wasm_singlethread` prebuilt kit from the Qt online installer
  (`~/Qt/6.11.1/wasm_singlethread`; host tools `~/Qt/6.11.1/macos`), emsdk **4.0.7** (Qt's
  pinned version for 6.11, `QT_EMCC_RECOMMENDED_VERSION`), CMake 3.x + Ninja, Release build,
  `-s ALLOW_MEMORY_GROWTH=1`, `-lembind`.
- Logos design system copied from `logos-co/logos-design-system` @ `46324608` (2026-09-09,
  master) into `app/ds/`, built as its own STATIC `qt_add_qml_module`s and linked directly
  (the repo's `Logos::DesignSystem` umbrella uses `WHOLE_ARCHIVE`, which collides with Qt's
  in-tree static-plugin auto-import in the same build; linking the backing libs and plugins
  plainly works). Public Sans, icons, `QtCore.Settings` all resolve in wasm.
- iOS host: Swift, CMake Xcode generator (`ios/CMakeLists.txt`), Xcode 26.6, team 8B5X2M6H2Y,
  `isInspectable = true`. Android host: Java (not Kotlin, to avoid pulling the Kotlin plugin;
  functionally identical), AGP 8.9.3, Gradle 8.12, `androidx.webkit` 1.12.1, targetSdk 35.
- Instrumentation: page posts `window.spikeEvent(name, value)` to the host
  (`webkit.messageHandlers.spike` / `SpikeAndroid.event`); the native side timestamps against
  the kernel process start (`sysctl kinfo_proc` / `Process.getStartElapsedRealtime()`), logs
  `UIKeyboard*` notifications / root-view inset changes, and runs a fixed scenario through
  `evaluateJavaScript` (`spikeCommand`, `spikeTap`, `spikeFlick`, `spikeHeapReport`).
  Raw logs: `runs/*.log`, memory samples `runs/*.mem`, screenshots `shots/`.

## Reproduce

```bash
scripts/build-wasm.sh                       # -> dist/www (needs ~/Qt/6.11.1 + emsdk/ checked out here)
cmake -S ios -B build-ios -G Xcode -DCMAKE_SYSTEM_NAME=iOS -DCMAKE_OSX_ARCHITECTURES=arm64
xcodebuild -project build-ios/SpikeHost.xcodeproj -scheme SpikeHost -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=<udid>' CODE_SIGNING_ALLOWED=NO build
scripts/sim-run.sh <label> 34 --mode scheme|loopback|file|http [--isolate] --auto
xcodebuild ... -sdk iphoneos -destination 'id=<device>' -allowProvisioningUpdates DEVELOPMENT_TEAM=8B5X2M6H2Y build
xcrun devicectl device install app --device <id> build-ios/Release-iphoneos/SpikeHost.app
xcrun devicectl device process launch --console --device <id> co.logos.spike.qtwasm --mode scheme --auto
(cd android && gradle assembleDebug) && adb install -r android/app/build/outputs/apk/debug/app-debug.apk
scripts/android-run.sh <label> 28 --es mode scheme --ez auto true
python3 scripts/serve.py 8765 [--isolate]   # LAN server for the http modes
```
