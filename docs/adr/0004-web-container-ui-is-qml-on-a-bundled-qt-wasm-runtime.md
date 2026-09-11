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
  nothing builds it there yet. The design system is not in that image yet
  (slice 27 continues).
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
- Everything in the Web container is single-threaded; concurrency is
  "more workers", never pthreads.
