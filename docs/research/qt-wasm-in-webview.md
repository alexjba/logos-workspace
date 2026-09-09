# Qt for WebAssembly inside iOS WKWebView / Android WebView

Research date: 2026-09-09. Question: can Qt for WebAssembly (Qt 6.9–6.11) run a Qt Quick/QML app inside an iOS WKWebView or Android WebView, and what are the hard requirements and costs? Follow-on: one bundled Qt-wasm QML runtime fetching per-module QML at runtime; a Rust core compiled to wasm32 called from it.

Legend: **[P]** primary source read directly. **[S]** secondary or search-summarised; second-hand. **[I]** my interpretation.

## TL;DR

- Qt lists mobile Safari and Android Chrome as browsers the port "runs on", but WebAssembly has no support tier and Qt "strongly recommend[s]" comprehensive testing on mobile. WKWebView and Android WebView are not mentioned anywhere in Qt docs. **[P]** (§1)
- Hard requirement: WebGL (2 preferred, 1 fallback). No 2D-canvas or software path. **[P]** (§1)
- Threads need SharedArrayBuffer, which needs https/localhost plus COOP/COEP cross-origin isolation. Android WebView reports `crossOriginIsolated == false` even with correct headers (open Chromium bug). WKWebView with a custom scheme is unverified. Multithreaded Qt builds also OOM on iOS Safari. Plan on the **single-threaded** build. **[P]** (§2)
- Cost: a Qt Quick Controls app is roughly 6–9 MB compressed / 20–30 MB uncompressed wasm; Canonic's QML runtime is 27 MB / 6.7 MB brotli. Qt publishes no startup-time numbers; iOS Safari has a tighter memory ceiling than other browsers. **[P]** (§3)
- Dynamic linking / runtime plugin loading is Technology Preview, "not suitable for production", excludes threads and asyncify, and QML run-time module loading is still an open investigation (QTBUG-124896). A Rust `cdylib` cannot be `dlopen`ed into Qt-wasm in practice; run it as a separate wasm instance bridged through JS. **[P]** (§4, §8)
- Fetching **QML/JS text** at runtime works today (QML network transparency; Canonic proves it in wasm). Fetching QML modules that need C++ plugins does not. **[P]** (§4, §5)
- Canonic is a dormant GPL3 prototype (last code commit Jan 2022), single wasm binary, no extension mechanism for loaded content. Useful as an existence proof, not as a dependency. **[P]** (§5)
- No Qt Company, KDAB, Felgo or ICS write-up of Qt-wasm inside a native webview exists. The one Qt forum thread (Android WebView, 2023) is unanswered. One 2026 Qt bug shows someone running Qt-wasm under an embedded WebKit keyboard. Everything else needs a spike. **[P]** (§7)

## 1. Platform requirements

Source: https://doc.qt.io/qt-6/wasm.html (Qt 6.11) **[P]** unless noted.

- Browsers: "developed and tested on the following browsers: Chrome, Firefox, Safari, Edge". Mobile: "Qt for WebAssembly applications runs on mobile browsers such as mobile Safari and Android Chrome."
- Supported-platforms page: WebAssembly is listed as "Web Browser / wasm32 / Emscripten 4.0.7 / Chrome, Edge, Firefox, Safari" outside the Tier 1/2/3 table, with: "some mobile browsers may still lack some necessary features for reliably executing WebAssembly apps. Therefore, we strongly recommend application providers targeting mobile browsers to conduct comprehensive testing". https://doc.qt.io/qt-6/supported-platforms.html **[P]**
- WebGL: "Qt has a fixed WebGL requirement, even if the application itself does not use hardware accelerated graphics." OpenGL ES 2 → WebGL 1, ES 3 → WebGL 2; "Qt uses the highest available WebGL version." qtloader.js exposes an API to check WebGL availability. No 2D-canvas or software fallback is documented.
- Emscripten pins: Qt 6.9 → 3.1.70 (https://doc.qt.io/qt-6.9/wasm.html **[P]**); Qt 6.10.3 and 6.11.2 → 4.0.7 (https://doc.qt.io/qt-6.10/wasm.html, qt-6 **[P]**). The Qt doc says versions must match because of ABI incompatibility.
- Tested modules include Core, GUI, Network, Widgets, QML, Quick, Quick Controls, Charts, Graphs, Quick 3D; Multimedia is Technology Preview.
- Limits: networking only via QNetworkAccessManager to origin/CORS hosts and QWebSocket; no QWebSocketServer, no QSsl/QDnsLookup, no printing, file dialogs via `<input type=file>`, clipboard limited.
- Serving: "Running the application requires a web server." Compression is left to the server; .wasm should be pre-compressed with gzip or brotli.
- WKWebView / Android WebView: not mentioned on any Qt doc page fetched. **[P, absence]**

## 2. Multithreading, SharedArrayBuffer, cross-origin isolation

- Qt ships "single-threaded and multi-threaded versions" of the binaries; threads via `-feature-thread`, each thread a web worker. https://doc.qt.io/qt-6/wasm.html#multithreading **[P]**
- Requirement: "browser support for the SharedArrayBuffer API", a "secure browsing context (where the page is served over https:// or http://localhost)", and cross-origin isolated mode via `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`. Same page. **[P]**
- Qt warns: "it is especially important to not block the main thread on Qt for WebAssembly, since the main thread might be required to service requests from secondary threads." Same page. **[P]** Morten Sørvig's 2019 post: `QThread::wait`/`pthread_join` on the main thread "may deadlock". https://www.qt.io/blog/2019/06/26/qt-webassembly-multithreading **[P]**
- Emscripten: "Pthreads code will not work in deployed environment unless these headers are correctly set"; pthreads + `ALLOW_MEMORY_GROWTH` "is especially tricky". https://emscripten.org/docs/porting/pthreads.html **[P]**
- Emscripten: "Dynamic linking + pthreads is still experimental." https://emscripten.org/docs/compiling/Dynamic-Linking.html **[P]** Qt: dynamic linking "Multithreading is not supported. Asyncify is not supported." **[P]**
- WebKit: Safari 15.2 (iOS 15.2) re-enabled SharedArrayBuffer and "Wasm threading" for pages serving both headers. https://webkit.org/blog/12140/new-webkit-features-in-safari-15-2/ **[P]** Implementation: a cross-origin-isolated page gets a fresh WebProcess launched with an XPC flag that permits SharedArrayBuffer. https://trac.webkit.org/changeset/281832/webkit **[P]**
- WKWebView + custom scheme: `WKURLSchemeHandler` replies with an `NSHTTPURLResponse`, and since WebKit r253501 (Dec 2019) may set CORS headers on it. https://bugs.webkit.org/show_bug.cgi?id=205198 **[P]** Whether WebKit honours COOP/COEP from a non-http(s) scheme and marks the page cross-origin isolated is **not documented anywhere I found**. Custom schemes are treated as insecure: an https-based page cannot fetch from a custom scheme ("The page was not allowed to display insecure content"). https://developer.apple.com/forums/thread/725916 **[P]** SharedArrayBuffer additionally requires a secure context (MDN, **[S]**). **[I]** Expect `crossOriginIsolated == false` for custom-scheme and `file://` documents; verify in the spike.
- Android WebView: Chromium issue "SharedArrayBuffer is unavailable in Android WebView because crossOriginIsolated is false" even with correct COOP/COEP headers (Chrome 113, filed May 2023, last modified Nov 2025, no fix seen). https://issues.chromium.org/issues/40914606 **[P]** chromestatus lists wasm threads shipped on desktop 74 / Android 88 and no WebView entry. https://chromestatus.com/feature/5724132452859904 **[P]** Blink-dev intent for Android SAB explicitly targeted Chrome-Android, not WebView. **[S]**
- Qt on mobile with threads: QTBUG-113691 "Cannot run any app built with multi-threaded configuration on mobile browsers" (6.5); Android fixed by serving headers, iOS failed with `RangeError: Out of memory` → QTBUG-112297, closed "Out of scope": "Qt is hitting a built-in memory limit on Safari"; workaround `-sMAXIMUM_MEMORY=1400MB` found by trial and error. **[P]**
- Consequence for single-threaded Qt: QML `WorkerScript` is synchronous (Felgo doc, https://felgo.com/doc/felgo-deployment-web/ **[P]**); Qt Quick render thread and app logic share the browser main thread. **[I]**

## 3. Size, startup, memory

| Item | Value | Source |
|---|---|---|
| helloglwindow (Core+Gui) | 2.8 MB gzip / 2.1 MB brotli | Qt 6.11 wasm doc **[P]** |
| wiggly widget (+Widgets) | 4.3 MB gzip / 3.2 MB brotli | same |
| SensorTag (Core+Gui+Widgets+Quick+Charts) | 8.6 MB gzip / 6.3 MB brotli | same |
| Canonic QML browser (Gui+Quick+Quick3D+QuickControls2+WebSockets) | ~27 MB wasm, 6.7 MB compressed | Canonic FAQ **[P]** |
| Typical Qt QML wasm app | "easy to hit 20–40 MB"; "the first 16 MB is probably mostly the same for every QML app" | Canonic FAQ https://github.com/canonic/canonic/blob/main/docs/faq.mdx **[P]** |
| Default initial heap | 50 MB (`QT_WASM_INITIAL_MEMORY`) | Qt 6.11 wasm doc **[P]** |
| iOS Safari memory | "Safari limits browser memory to much less than the other browsers" | Lorn Potter, Qt blog, Mar 2022 https://www.qt.io/blog/qt-for-webassembly-on-mobile-devices **[P]**; QTBUG-112297 **[P]** |
| Startup time | No Qt-published numbers found | Qt wasm doc, 2024 status update, "Reducing binary size part 3" (Jun 2025, charts only) **[P]** |

- Qt's "Reducing Binary Size – Part 3" (Juha Vuolle, Jun 2025, emsdk 4.0.7) shows charts for Simple, Calqlatr, Gallery, Colorpalette Client, Coffeemachine in reference/stripped/minimal configs but gives no numbers in text; a minimal Qt configure with LTO is the documented lever. https://www.qt.io/blog/reducing-binary-size-of-qt-applications-part-3-more-platforms **[P]**
- Safari 26.0 added an in-place wasm interpreter "for faster startup of large Wasm modules". **[S]** (webkit.org via search summary)
- Asyncify (needed for nested event loops / `exec()` dialogs) "introduces overhead in the form of longer build times, larger binary sizes, and runtime performance costs". Qt wasm doc **[P]** QTBUG-143723: asyncify+threads build made Safari spin at 100% CPU / 10–14 GB in WebKit's OMG compiler; closed out of scope. **[P]**

## 4. Dynamic linking, plugins, runtime QML

- Qt 6.11: "Dynamic linking support in 6.11 is in Technology Preview"; "suitable for prototyping and evaluation, but is not suitable for production use." Qt libs become Emscripten `SIDE_MODULE` `.so` files, the app is `MAIN_MODULE`; `wasmdeployqt` writes `qt_plugins.json` / `qt_qml_imports.json` that qtloader downloads **at startup**. https://doc.qt.io/qt-6/wasm.html#dynamic-linking **[P]** Qt 6.9 called it "developer preview". **[P]**
- Open work (QTBUG-117381, Reported, fix version 6.12, updated Nov 2025): threads for shared libs (QTBUG-114256, Open, updated Aug 2026), QLibrary async load via `emscripten_dlopen()` (QTBUG-125024, Reported), "QML run-time module loading" (QTBUG-124896, Reported, updated 2026-08-19: "We currently support load-time QML module loading… Investigate how this would work for Qt on WebAssembly when using dynamic linking"), plugins/dlopen (QTBUG-108231, Open). https://bugreports.qt.io/browse/QTBUG-117381 **[P]**
- Emscripten: exactly one main module; `dlopen` needs side modules in the (virtual) filesystem; `MAIN_MODULE=1` disables dead-code elimination, `=2` restores it at the cost of manual symbol keep-alive. https://emscripten.org/docs/compiling/Dynamic-Linking.html **[P]**
- Side-module ABI: a loadable module must carry a `dylink.0` section and import `env.memory`, `env.__indirect_function_table`, `__memory_base`, `__table_base`; produced by LLVM with `--relocation-model=pic`. https://github.com/WebAssembly/tool-conventions/blob/main/DynamicLinking.md **[P]** A `wasm32-unknown-unknown` Rust cdylib has none of this. **[I]**
- Rust on Emscripten: `wasm32-unknown-emscripten` is Tier 2 and "the Emscripten compiler toolchain does not follow semantic versioning"; you must rebuild std with the matching emsdk. https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-emscripten.html **[P]** Building a `cdylib` with `-sSIDE_MODULE` has a history of linker failures (rust-lang/rust#80775, closed). **[S]**
- Runtime QML fetch: "QML supports network transparency by using URLs (rather than file names) for all references"; the engine loads `http://…/qmldir` next to the document; `import "dir"` / `import libraryUri` are local-only, only the `as` forms are network transparent; "QML and JavaScript resources must only be loaded from trusted remote locations." https://doc.qt.io/qt-6/qtqml-documents-networktransparency.html **[P]** Qt 6 Book shows `Loader { source: "http://…/RemoteComponent.qml" }` and notes remote creation is asynchronous. https://www.qt.io/product/qt6/qml-book/ch13-networking-serve-qml **[P]**
- In wasm the fetch goes through QNetworkAccessManager, which works for the page origin or CORS hosts. Qt wasm doc **[P]** Canonic does exactly this from a wasm build (§5). **[I]** A custom-scheme origin needs the scheme handler to answer QML, qmldir and images; a `plugins.qmltypes` file (even empty) was needed for network module imports in wasm per Canonic. **[P]**
- JS bridge from Qt-wasm: Emscripten `EM_JS`, `EM_ASM`, `emscripten::val` (C++→JS) and `ccall`/`cwrap`/`EXPORTED_FUNCTIONS`/embind (JS→C++). https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html **[P]** Felgo layers Qt WebChannel over a wasm transport to expose QObjects to page JS. https://blog.felgo.com/how-to-integrate-qt-webassembly-wasm-and-the-browser-using-javascript **[P]**

## 5. Canonic

Sources: https://github.com/canonic/canonic (README, `canonic.pro`, `build/`, `docs/*.mdx`) and GitHub API. **[P]**

- What: "experimental QML web browser", GPL3, "world's first browser within a browser"; live at app.canonic.com as a Qt-wasm build; "Canonic does not understand HTML or WASM".
- Build: qmake, `QT += gui quick quick3d quickcontrols2 websockets`; wasm via `build.py` with emsdk, brotli-compressed, uploaded to S3; `index.html` uses the old `QtLoader({canvasElements: [...]})` API and a hidden `<canvas contenteditable>` (pre-6.6 loader). **[I]** Qt 5.15/6.2-era.
- Architecture: two `QQuickRenderControl` instances, each with its own `QQmlEngine`, rendering to hidden virtual windows composited "using GLSL"; loaded QML cannot reach browser UI via `parent`. Views: QML, JSON, raw source, HTML (stub).
- Loading: fetches `.qml`/`text/qml` over http(s); every request is proxied through a CORS proxy; requires `qmldir` next to files; only `as`-form imports.
- Extensions: none. Content is QML+JS only; "additional logic to handle QMLs access to C++ land" is listed as missing; "The plan is to make it possible for people to write their own views in the near future." No plugin, native or wasm extension API.
- Security: "Canonic does not yet fully sandbox content it loads from the internet"; native release withheld for that reason. https://docs.page/canonic/canonic **[P]**
- Status: last code commit 2022-01-19; last commit at all 2023-12-15 (doc typo PRs); 0 releases, 0 tags; 158 stars; 1 open issue; org's other recent activity is forks of framelesshelper/KDDockWidgets/qwindowkit. Dormant. GitHub API **[P]**

## 6. Rendering and WebKit/Chromium feature status

- Qt renders into `<canvas>` via WebGL; `qtloader.js` takes `containerElements` ("The application sees these as QScreens") and can add/remove/resize them. Qt 6.11 wasm doc **[P]**
- WebKit: WebGL2 in Safari 15, "runs on top of Metal". https://webkit.org/blog/11989/new-webkit-features-in-safari-15/ **[P]** SAB/threads + 4 GB wasm memory in 15.2. **[P]** 128-bit SIMD in 16.4. https://webkit.org/blog/13966/webkit-features-in-safari-16-4/ **[P]** Wasm GC and tail calls in 18.2, new exception spec in 18.4, wasm with JIT disabled in 18.4. **[S]**/**[P]** JSPI not shipped; WebKit dropped its objection late 2025. **[S]** (Qt's JSPI path needs a source build anyway. **[P]**)
- WebKit release notes list features per Safari version and never say "and WKWebView". Apple's WKWebView doc says only that it "presents HTML, CSS, and JavaScript content". https://developer.apple.com/documentation/webkit/wkwebview **[P]** **[I]** WKWebView is the same system WebKit, so WebGL2/SIMD availability should match the iOS version; the process-isolation-dependent bits (SAB) are the ones to verify.
- Chromium: WebGL 2 shipped Chrome 56 / Android 58 / **WebView 58**; SIMD 91 (Android 91); threads desktop 74 / Android 88, no WebView entry. https://chromestatus.com/feature/6694359164518400 , /6533147810332672 , /5724132452859904 **[P]**
- Qt bugs touching Safari/iOS/WebKit (Jira REST, 2026-09-09) **[P]**:
  - QTBUG-149393 (In Progress, Aug 2026): backspace broken with "WebKit-embedded virtual keyboards" because `QWasmInputContext` ignores `deleteContent`; affects 6.8.3/dev. Direct evidence of Qt-wasm under an embedded WebKit.
  - QTBUG-147635 (Reported, Jun 2026): mouse events die after iOS Control Center in a home-screen standalone web app, 6.8.3.
  - QTBUG-143723 (closed Out of scope, Jul 2026): Safari CPU/memory blow-up with asyncify+threads.
  - QTBUG-118596 (Out of scope): Safari 17 severe UI lag, also on Qt's own Slate demo.
  - QTBUG-112297 (Out of scope): iOS OOM with multithreaded build.
  - QTBUG-134586 (Reported): VoiceOver navigation on mobile Safari unsupported.
  - Fixed recently: inputMethodHints keyboard type (6.10.3/6.11), TextField update timing on mobile (6.10.2), iOS combobox unfocus (6.11 beta3), iOS camera orientation (6.12), QMediaPlayer on mobile (6.7), native keyboard on iOS/Android (6.4, then 6.5.x/6.6/6.7 regressions).
  - Audio: QtMultimedia audio landed in 6.2 (QTBUG-69444). **[S]**

## 7. Documented cases of Qt-wasm inside a native webview

- Qt forum, Apr 2023: Qt wasm examples in an Android WebView (Xamarin); slate worked, industrial control panel did not, suspected missing JS API; no replies, topic later deleted. https://forum.qt.io/topic/144230/… **[P]**
- QTBUG-149393 (2026): reporter observed Qt-wasm with "embedded-browser virtual keyboards" on WebKit. **[P]**
- Felgo: "Due to mobile browser support of WebAssembly, running the WebAssembly target on mobile devices is currently not intended." https://felgo.com/doc/felgo-deployment-web/ **[P]**
- Nothing from Qt Company blogs (tag page lists 10 posts, none on webviews), KDAB, ICS. **[P, absence]** Generic "WebAssembly on iOS via WKWebView" gists exist but are not Qt. **[S]**

## 8. Conclusions

### 8.1 Bundled Qt-wasm QML runtime in a WKWebView / Android WebView, fetching per-module QML

Proven, separately:
- Qt Quick/QML wasm runs in mobile Safari and Android Chrome, single-threaded, with native keyboard and touch (with a steady stream of iOS-specific bugs). **[P]**
- QML documents, JS and images can be fetched at runtime over http(s) from a Qt-wasm process (Canonic). **[P]**
- A page can host Qt in an arbitrary container element via qtloader.js. **[P]**

Not proven, needs a spike:
- Qt-wasm loading inside WKWebView from the bundle. Serving path: `WKURLSchemeHandler` with a custom scheme as the document origin (so fetches stay in-scheme), returning `application/wasm`, brotli off (no HTTP compression in-process; file size on disk is the cost). Check: WebGL2 context, `crossOriginIsolated` (expect false), keyboard, memory on an older device, cold-start time, Control Center bug (QTBUG-147635).
- Android: `WebViewAssetLoader` on `https://appassets.androidplatform.net` gives an https origin, custom headers allowed; SAB still absent (Chromium 40914606). https://developer.android.com/reference/androidx/webkit/WebViewAssetLoader **[P]**
- Loading QML from the custom scheme: QNetworkAccessManager in wasm maps to fetch/XHR; custom-scheme requests from a custom-scheme document should work (Apple forum thread), but this is untested with Qt's QML engine. `qmldir` and `plugins.qmltypes` must be served.
- Modules needing C++ plugins cannot be delivered at runtime: dynamic linking is TP, no threads/asyncify, and run-time QML module loading is an open investigation. Design so that per-module content is QML+JS only, with the fixed C++/QML type set baked into the runtime binary.

Verdict: feasible in principle, single-threaded only, with a large fixed payload and no runtime native extensibility. Treat it as a spike, not a plan, until the WKWebView load, memory and input tests pass on real devices. **[I]**

### 8.2 Rust core (wasm32) called from the Qt-wasm QML runtime

- Do not `dlopen` it into Qt: Emscripten side modules need the `dylink.0` PIC ABI and an Emscripten-matched toolchain; Qt's dynamic linking is TP and excludes threads; Rust `cdylib`+`SIDE_MODULE` is fragile. **[P]**
- Viable A: build Rust as `wasm32-unknown-unknown` (wasm-bindgen), instantiate it in page JS as a second wasm instance, and bridge through JS: C++ `emscripten::val`/`EM_JS` calls from a QObject exposed to QML; JS calls back via exported C functions or embind. Separate memories, so data crosses as strings/ArrayBuffers copied through JS. Same main thread, synchronous calls fine. **[P]** + **[I]**
- Viable B: build Rust as `wasm32-unknown-emscripten` and statically link into the Qt app. Pins rustc to Qt's emsdk (4.0.7 for 6.10/6.11), Tier 2, std rebuild recommended. Tighter coupling, one binary, no JS hop. **[P]**
- Either way the Rust code runs single-threaded unless SAB is available, which it will not be in Android WebView and probably not in WKWebView from a custom scheme. **[P]** + **[I]**

### 8.3 Cost versus a plain HTML/JS UI

| Cost | Qt-wasm QML runtime in webview | Plain HTML/JS in webview |
|---|---|---|
| Runtime payload in app bundle | ~20–30 MB uncompressed wasm (Quick+Controls; Canonic 27 MB); 6–9 MB if the host can serve brotli | 0 (engine is the OS webview) |
| Per-module content | QML/JS text, fetched at runtime; no C++ plugins | HTML/JS/CSS text |
| Heap | 50 MB initial by default, grows; iOS Safari ceiling lower than other browsers | tens of MB typical for a page **[I]** |
| Startup | download/read + wasm compile of 20–30 MB + Qt init; no Qt numbers; Safari 26 interpreter helps | near-instant |
| Threads | none in webviews (SAB) | Web Workers freely (no SAB needed) |
| Rendering | requires WebGL; canvas, no DOM text/a11y (a11y via Qt's DOM underlay, VoiceOver on mobile Safari unsupported) | native DOM, a11y free |
| Input | Qt's synthesised keyboard/touch; recurring iOS bugs | native |
| Toolchain | Qt 6.11 + emsdk 4.0.7 exact; static build per Qt config | none |
| Support | no Qt tier; "test comprehensively"; webview not covered | vendor-supported |

## Sources (primary, fetched 2026-09-09)

- https://doc.qt.io/qt-6/wasm.html ; https://doc.qt.io/qt-6.9/wasm.html ; https://doc.qt.io/qt-6.10/wasm.html
- https://doc.qt.io/qt-6/supported-platforms.html
- https://doc.qt.io/qt-6/qtqml-documents-networktransparency.html
- https://doc.qt.io/qt-6/whatsnew611.html (wasmdeployqt, GeoLocation backend)
- https://lists.qt-project.org/pipermail/development/2024-June/045384.html (Sørvig status update)
- https://www.qt.io/blog/qt-for-webassembly-on-mobile-devices ; https://www.qt.io/blog/2019/06/26/qt-webassembly-multithreading ; https://www.qt.io/blog/reducing-binary-size-of-qt-applications-part-3-more-platforms ; https://www.qt.io/blog/qt-webassembly-qa-part-1
- Qt Jira via REST: QTBUG-117381, -63925, -114256, -124896, -125024, -108231, -113691, -112297, -149393, -147635, -143723, -118596, -134586, -88802, -88803, -83064, -67234
- https://emscripten.org/docs/porting/pthreads.html ; https://emscripten.org/docs/compiling/Dynamic-Linking.html ; https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html ; https://emscripten.org/docs/tools_reference/settings_reference.html
- https://github.com/WebAssembly/tool-conventions/blob/main/DynamicLinking.md
- https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-emscripten.html
- https://webkit.org/blog/11989/ ; https://webkit.org/blog/12140/ ; https://webkit.org/blog/13966/ ; https://trac.webkit.org/changeset/281832/webkit ; https://bugs.webkit.org/show_bug.cgi?id=205198
- https://developer.apple.com/documentation/webkit/wkwebview ; https://developer.apple.com/documentation/webkit/wkurlschemehandler ; https://developer.apple.com/forums/thread/725916
- https://issues.chromium.org/issues/40914606 ; https://chromestatus.com/feature/6694359164518400 ; https://chromestatus.com/feature/6533147810332672 ; https://chromestatus.com/feature/5724132452859904 ; https://developer.chrome.com/blog/enabling-shared-array-buffer
- https://developer.android.com/reference/androidx/webkit/WebViewAssetLoader
- https://github.com/canonic/canonic ; https://docs.page/canonic/canonic ; GitHub API for canonic org
- https://felgo.com/doc/felgo-deployment-web/ ; https://blog.felgo.com/how-to-integrate-qt-webassembly-wasm-and-the-browser-using-javascript
- https://forum.qt.io/topic/144230/ ; https://forum.qt.io/topic/115701/
