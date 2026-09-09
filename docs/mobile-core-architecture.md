# Logos on mobile: core architecture (decided 2026-09-09)

Answers to the three questions posed for the mobile track, grounded in the code
under `repos/`, Apple/Google policy texts (`docs/research/ios-runtime-qml-policy.md`),
and Qt-for-WebAssembly facts (`docs/research/qt-wasm-in-webview.md`). Decisions
are recorded as ADRs 0003–0007; terms in `CONTEXT.md`.

## 1. Logos core: local, not remote

**Decision: local core on the phone.** A Remote core (phone as a client of the
user's desktop core) was evaluated and dropped.

- What already exists for remote: plain TCP and TCP+TLS transports in
  logos-protocol, per-module transport sets in liblogos, a Qt-free JS SDK
  consuming modules over TCP. Module-level remoting is real today.
- What does not: the runtime seam Basecamp uses (`ICoreRuntime`: load, unload,
  list, refresh, stats) is in-process C API only; `modules_state_module` covers
  the read half, load/unload has no remote provider. Qt Remote Objects (what
  UI apps use between QML and their backend) has no auth or encryption and
  would need tunnelling.
- UX: the phone is unusable without the desktop on and reachable; pairing,
  NAT and link encryption are product work for a throwaway.
- DX: nothing a module author writes changes either way, but the UI side
  would need QML fetched over the wire, which is dogfood-only under App Store
  2.5.2 (see §2).
- Why it looked easier: it sidesteps loading any module code on iOS. Why it
  is not: none of its pieces survive into the product architecture, and the
  Native container it would postpone is a small spike plus product code.

## 2. Modules on iOS: Bundled native, Downloaded in the Web container

**Policy facts (primary sources).** Apple's DPLA 3.3.1(B) allows downloaded
interpreted code by any interpreter (the WebKit-only carve-out was removed in
2017) but forbids downloading executable code; guideline 2.5.2 forbids
downloaded code that adds features; guideline 4.7 explicitly permits
"HTML5 and JavaScript mini apps ... and plug-ins" not embedded in the binary,
with obligations (4.7.2 no native platform API exposure, 4.7.3 per-plug-in
consent, 4.7.4 index with universal links, 4.7.5 age gating). Google Play
forbids downloading `.so`/dex from outside Play with the same webview/
interpreter exception. Enforcement is pattern-driven: apps whose visible
purpose is hosting other apps get pulled.

**Consequences.**

- Native modules on a Store shell are **Bundled** only: fixed at build time,
  signed with the app. There is no downloadable native path on iOS or Play.
- Runtime installs on a Store shell go through the **Web container**: one
  WKWebView (Android WebView, Qt WebEngine on desktop) per Downloaded module,
  which is the sanctioned 4.7 plug-in pattern and gives OS-process isolation
  stronger than desktop's subprocess container.
- Downloaded QML into the native Qt engine (Canonic-style, Felgo-style) is
  legal on paper and unenforced against Felgo for a decade, but a module
  catalog is exactly the "app that hosts apps" pattern Apple removes. Not used
  by the product.

**Do current modules work in the Web container? Not as-is; the shape does.**

- A module today is a Qt-free impl plus Rust core behind one C ABI, fused with
  generated Qt glue and a static logos-protocol into one plugin. The Web
  variant is the same impl plus core compiled to wasm ("Wasm host", in a Web
  Worker, single-threaded), linking logos-protocol compiled to wasm, and
  speaking the plain transport's messages over a postMessage bridge ("web"
  transport). No new API, no new auth: tokens are minted by capability_module
  and validated by the module's own ModuleProxy as over TCP.
- Module-side port cost is the I/O: a webview has fetch, WebSocket, WebRTC,
  IndexedDB/OPFS, WebCrypto, and no raw TCP/UDP. Offline crypto modules
  (keystore, wallet-backend: `alloy`, no network) port with a storage
  abstraction; networking modules (libp2p via nim-libp2p TCP/QUIC, delivery,
  chat) do not and do not need to: they are always Bundled, and Downloaded
  modules reach them as services over the bridge. Wallet HTTP already goes
  through one fail-closed chokepoint (`build_client` in logos-net-proxy), so
  retargeting to fetch is one change.
- UI: QML stays the UI language. One Qt-for-WebAssembly QML runtime is
  bundled in the app (~25 MB wasm, ~7 MB compressed, WebGL2, single-threaded);
  each Downloaded module contributes QML and its Wasm host; the C++ backend of
  a `ui_qml` app runs inside the Wasm host and is remoted to the QML runtime
  over Qt Remote Objects on a MessagePort transport, mirroring desktop's
  `ui-host` split. HTML/JS UIs are allowed. Gated by a device spike
  (Qt-wasm in WKWebView is unproven: custom-scheme load, WebGL2, memory,
  keyboard, cold start).

**Effort (estimates, engineering weeks, one person unless noted).**

| Work | Estimate | Gate |
|---|---|---|
| Linker spike: Bare module framework dlopened by static-Qt host on iOS, lp_* and Qt resolving upward | 0.5 | decides ADR 0006 vs static table |
| Native container + in-process loader in liblogos, `LogosMode::Local` hardening, per-identity token stores, generic host glue | 4–6 | upstream-first; Status ADR 0007 amendment |
| Builder output: Bare module (no protocol linked), `ios-arm64` / `android-*` variants, catalog-driven Bundled-set build in nix | 2–3 | |
| Store shell milestone 1: Basecamp mobile host + Bundled chat/delivery/libp2p | 2–3 on top of the above | first demo |
| Web container spike: Qt-wasm runtime in WKWebView | 1 | decides ADR 0004 |
| "web" transport (postMessage), Web container + format loader, browser JS SDK | 3–4 | |
| Wasm host: Bare module to wasm, logos-protocol to wasm, QtRO over MessagePort, Emscripten toolchain in nix | 4–6 | |
| First Web-variant module ports (keystore, wallet UI) + host storage abstraction | 2–4 | |
| Catalog 4.7 features: index with universal links, consent, report, signer trust UX | 2–3 | Store submission |

Roughly a quarter to milestone 1 with two people; the Web container is a second
quarter. Parallelisable: the two spikes now, Native container and Web
transport after.

## 3. App architecture

```
Store shell (App Store / Play)                  Desktop / non-store Android
┌────────────────────────────────────────┐      same, plus native Downloaded
│ Shell (QML, static)                    │      modules in the subprocess
│ Basecamp host: local liblogos core     │      container as today
│  ├─ Native container ── Bundled set    │
│  │    embedded frameworks, dlopen      │
│  │    RTLD_LOCAL, lp_*/Qt resolve up   │
│  │    (chat, delivery, libp2p, wallet) │
│  └─ Web container ── Downloaded modules│
│       one webview each                 │
│       ┌ Qt-wasm QML runtime (bundled)  │
│       └ Wasm host (module in a Worker) │
│         ↕ QtRO / MessagePort           │
│         ↕ "web" transport ↔ core       │
│ capability_module = single trust root  │
└────────────────────────────────────────┘
```

- One catalog, per-platform variants (`linux-*`, `darwin-*`, `windows-*`,
  `android-arm64`, `android-x86_64`, `ios-arm64`, `ios-sim-arm64`, `web`).
  A Store shell installs `web` at runtime and bundles native mobile variants
  at build time from the same signed artifacts: `ws build logos-basecamp
  --target ios-arm64 --bundle chat_ui,wallet_ui` resolves the closure, fetches
  by Merkle root, verifies signatures, embeds frameworks, writes a Bundled-set
  manifest the Native container reads at start. No per-module codegen, no link
  step.
- Rules: Bundled depends only on Bundled; everything first-party that opens
  sockets is Bundled; a module without a `web` variant is listed as
  unavailable on Store shells, never installed-and-broken.
- Everything new sits on existing seams: `makeContainer` / `makeFormatLoader`
  in liblogos, the transport enum and plain message types in logos-protocol,
  `admitConsumer` / `forIdentity` in logos-plugin-qt, LGX variants in
  logos-package. No new auth model, no new module API.

## Sequence

1. Linker spike (ADR 0006) and Web container spike (ADR 0004), in parallel.
2. Native container in liblogos; builder Bare-module output; catalog-driven
   Bundled-set build.
3. Store shell milestone 1: real messaging on iOS and Android, nothing
   downloaded.
4. "web" transport, Web container, Wasm host toolchain, browser JS SDK.
5. Store shell milestone 2: first Downloaded web module from the catalog on
   iOS, with the 4.7 catalog features.

## Open items

- Status ADR 0007 amendment: frameworks carry no Qt and no protocol; the
  Bundled set is catalog-driven.
- Whether Apple's October 2025 wording change to 3.3.1(B) altered anything
  beyond wording (not diffed).
- Emscripten toolchain pinned in nix for Qt-wasm and Rust `wasm32`.
- Store shell backgrounding regime for modules (from ADR 0007's consequences).
