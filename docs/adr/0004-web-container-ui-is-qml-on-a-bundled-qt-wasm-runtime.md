---
status: accepted 2026-09-09 (device spike passed with caveats)
---
# The Web container renders module UI as QML on one bundled Qt-for-WebAssembly runtime; HTML/JS is allowed but not the primary path

A Downloaded module's UI must run inside the Web container, and the platform's
UI language, design system and every existing UI app are QML. We therefore
bundle a single Qt-for-WebAssembly QML runtime in the app (signed with it, ~25
MB wasm, single-threaded) and have each Downloaded module contribute its QML at
runtime, Canonic-style, instead of shipping a web edition of the design system
and a second UI language. A module's C++ backend is not linked into that
runtime (Qt-wasm dynamic linking is a technology preview); it runs in its own
Wasm host and is remoted to the QML runtime over Qt Remote Objects on a
MessagePort transport, mirroring the desktop `ui-host` split. HTML/JS module UIs
remain allowed because the container is a webview anyway. See
`docs/research/qt-wasm-in-webview.md`.

## Consequences

- Spike passed 2026-09-09 on iPhone simulator, iPad Air and a Samsung S21 FE
  (Qt 6.11.1 wasm single-threaded, emsdk 4.0.7, Logos.Theme/Controls linked
  in): WebGL2 present, design system renders, a remote QML document importing
  Logos.Controls instantiates at runtime, keyboard and touch scrolling work,
  no console errors. Report: `docs/research/spikes/qt-wasm-in-wkwebview.md`.
- The runtime is now built from source in nix (`logos-nix`,
  `nix/wasm/qt.nix`): Qt 6.11.1 for wasm32-emscripten, single-threaded and
  static, on the repo's pinned emsdk 4.0.12. A Qt Quick + Controls + Svg + QtRO
  image off that Qt measures **24,591,224 B raw / 6,421,646 B brotli** on
  aarch64-darwin (93% / 95% of the spike's kit-built numbers below), so the
  budget the ADR was accepted with holds. Reproduce with
  `nix build .#qt-wasm-qml-probe` in logos-nix; the probe fails if the image
  leaves the band. The same derivation is `checks.x86_64-linux.qt-wasm-qml-probe`
  for a Linux `nix flake check` — logos-nix' CI runs that with `--no-build`, so
  nothing builds it there yet.
- The design system links into such an image: `logos-design-system`
  `nix build .#wasm-smoke` produces a 20,368,741 B wasm carrying
  Logos.Theme/.Icons/.Controls with their QML plugins (asserted by reading the
  plugins' RTTI names back off the image — a Release wasm link leaves 19 names
  in the symbol table, so symbols prove nothing). The spike's note that the
  `Logos::DesignSystem` umbrella collides with Qt's static-plugin auto-import is
  confirmed and no longer needs working around: the umbrella's WHOLE_ARCHIVE and
  Qt's plain link of the same plugins are reconciled by
  `logos_design_system_resolve_static_plugins(<target>)`, which the design
  system's package config now ships.
- Budget per live QML runtime: ~26 MB wasm (6.8 MB brotli), 2.6–3.0 s cold
  start to first frame (1.3–2 s warm), 185–240 MB for the WebContent /
  renderer process. A phone therefore keeps the QML runtime alive only for
  the visible Downloaded module; background modules keep their Wasm host and
  drop their UI webview. The Native container's live-module budget (ADR 0003)
  is sized by this number.
- Load path: `file://` is dead on both platforms. On iOS a WKURLSchemeHandler
  serves the runtime bytes, but Qt's network layer refuses custom schemes, so
  QML documents fetched at runtime arrive either through JS fetch plus
  `createQmlObject` with a qrc base URL (no server needed) or through an
  in-app loopback HTTP listener (the only path that also yields
  `crossOriginIsolated`, irrelevant while single-threaded). Android's
  WebViewAssetLoader is https and needs neither.
- Two new transports: QtRO over MessagePort (QML runtime <-> Wasm host) and
  logos-protocol over the webview bridge (Wasm host <-> core).
- The first of those two is built: `logos-view-module-runtime`'s
  `logos_messageport` registers `messageport:` with QtRO's connection
  factories, so both ends stay ordinary QtRO (`QRemoteObjectHost` on one side,
  `connectToNode` on the other) and the node's reconnect timer covers a runtime
  that comes up before its backend. A port name is PROCESS-LOCAL — "the port
  this process was handed", never a rendezvous — because a browser has no
  directory to look one up in and inventing one would be inventing an identity
  a page could assert about itself (ADR 0005). Its behaviour is checked on the
  desktop over a loopback port pair with the same four properties a MessagePort
  has. One thing the port had to learn from the web platform: **delivery is off
  until `start()`**, and everything before it is queued rather than dropped — a
  backend writes QtRO's object list the instant it begins hosting, which is
  routinely before the runtime has attached anything to its end.
- **The runtime is built.** `nix build .#qml-runtime-wasm` in
  logos-view-module-runtime is this ADR's bundled runtime as one static image:
  Qt Quick, the Logos design system, the MessagePort transport and
  `LogosWebRuntime` — a QML engine with `logos` in its root context and a
  module's QML loaded into it as TEXT at install time. **25,888,796 B raw /
  6,672,518 B brotli** on aarch64-darwin, against the ~26 MB / 6.8 MB this ADR
  was accepted with — so the spike's number is confirmed to within a percent by
  a from-source build. The build asserts both things a successful static link
  can silently omit: every page-facing embind export (nothing in C++ references
  them) and the design system's QML plugins (Qt's static-plugin auto-import and
  the umbrella's `WHOLE_ARCHIVE` compete for exactly those).
- **The QML module surface is a build-time decision, and 5.0 MB of the image.**
  A static Qt has no plugin directory to search, so a QML module is reachable
  only if `qmlimportscanner` saw the import while linking the runtime — and a
  module's document arrives at RUNTIME, which is the whole point of this ADR, so
  the scan can never see it. `wasm/runtime/RuntimeImports.qml` is therefore the
  runtime's published surface (QtCore, QtQuick/.Controls/.Layouts/.Window, QtQml
  and the three Logos modules); adding to it costs size, removing from it breaks
  modules already published. Linking the CMake target is not enough and looks
  exactly like enough: with `Qt6::QmlCore` linked but nothing importing
  `QtCore`, the image builds, boots and paints its own shell, and the first
  document reaching `Logos.Theme` fails with `plugin "qtqmlcoreplugin" not
  found`. Naming the surface took the image from 20.9 MB raw to the 25.9 MB
  above.
- **It runs in a browser.** `node wasm/runtime/browser-smoke/run.mjs result/www`
  boots the image in headless Chrome and asserts 21 things: every embind export,
  a real MessagePort adopted, each promised QML module instantiated, TWO
  modules' documents installed into the one image, a document that does not
  compile reported rather than swallowed, and a removal. It is not a nix check
  and cannot be one (no browser in the sandbox; no chromium in darwin nixpkgs).
  Two of this ADR's assumptions were wrong until it ran: `QGuiApplication::exec()`
  RETURNS in a wasm image, so anything the page will call into has to outlive
  `main()`; and `return 1` from `main()` aborts the emscripten runtime, after
  which every call from the page throws. What it still does not cover is a
  PEER — nothing hosts a QtRO source on the far end of the port — so the replica
  half stays proven on the desktop against a real `QRemoteObjectHost` and a real
  `QQmlEngine`.
- **A page's whole API is four embind calls**, and no Qt type crosses:
  `logosAdoptMessagePort(name, port)` for the wire,
  `logosInstallModuleView(name, qmlText)` for a module,
  `logosRemoveModuleView(name)` and `logosRuntimeLastError()`. A second module is
  a second document on the same engine and the same node — the runtime is
  downloaded once, which is the load-path consequence this ADR asked for.
- **A module's QML takes its backend on an edge, not on first paint.** Inside
  the Web container `logos.module(name)` answers null until the backend's source
  meta has arrived, and the view re-takes it on `moduleReadyChanged`. Forced,
  not chosen: a page cannot dlopen the generated factory plugin that gives a
  desktop host a TYPED replica, so the replica is dynamic and builds its
  metaobject from the wire — and Qt's QML engine caches a property cache for an
  object the first time JS touches it, so a replica handed over early is cached
  with the generic `QRemoteObjectReplica` metaobject and its properties read
  `undefined` for the rest of the page's life. The synchronous `logos.callModule`
  is refused in this container for a related reason: its reply crosses a
  MessagePort, which delivers through the event loop a blocking caller has
  stopped running.
- Everything in the Web container is single-threaded; concurrency is
  "more workers", never pthreads.
