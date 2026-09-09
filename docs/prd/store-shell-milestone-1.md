---
title: Store shell milestone 1 — Bundled and Downloaded modules on iOS and Android
status: draft (local; not filed on GitHub by request)
triage: ready-for-agent
date: 2026-09-09
decisions: ADR 0003, 0004, 0005, 0006, 0007; Status ADR 0007 (amended)
glossary: CONTEXT.md
---

# Store shell milestone 1

## Problem Statement

A Logos user on a phone cannot run the platform at all today. The Shell preview
renders, but no module loads, nothing connects, and nothing can be installed.
On desktop the same user downloads a module from the catalog, launches it, and
connects it to others at runtime; on iOS and on Google Play the operating
system and the store rules forbid the mechanism desktop uses (a subprocess per
module, native code fetched after install). The user expects the desktop
experience: open Basecamp, see their apps, message people over the Logos
network, browse the catalog, install something new, and have it work, with the
same isolation and permission prompts they get on desktop.

Module and UI-app developers have a mirror of the problem: they have one
artifact per desktop platform and no way to reach a phone, no way to know
whether their module can run there, and no build path that produces something
a phone can use.

## Solution

Basecamp ships as a Store shell: one app, a local Logos core on the phone, and
two containers behind the core's existing seams.

- The **Native container** runs the **Bundled set**: first-party and chosen
  modules fixed at build time, each an embedded signed framework (a **Bare
  module**: implementation and core with no Qt and no protocol inside, symbols
  resolved from the app image), loaded lazily and isolated per image. Chat,
  delivery and libp2p are always in the Bundled set, so messaging works on the
  phone exactly as on desktop.
- The **Web container** runs **Downloaded modules**: anything the user
  installs from the catalog at runtime, one webview per module, the module's
  `web` variant executing as a **Wasm host** and its QML rendered by one
  bundled Qt-for-WebAssembly runtime. This is the store-sanctioned plug-in
  pattern on both stores and gives per-module OS-process isolation.
- **One catalog** lists every module with the variants it ships. A Store shell
  installs `web` variants at runtime and takes its native mobile variants from
  the same signed packages at build time, from a plain list of app names. A
  module without a `web` variant is shown as unavailable on the phone, never
  installed and broken.
- Capability tokens, `capability_module`, the plain protocol messages and the
  module C ABI are unchanged. The Web container is a fourth transport on the
  existing enum; the Native container is a new container and loader on the
  existing factory seams.

Both gating spikes passed on 2026-09-09 on the simulator, a signed iPad Air
and a Samsung device (see the spike reports under research).

## User Stories

### Phone user

1. As a phone user, I want to open Basecamp on iOS and Android and see the Shell with my apps, so that the phone feels like the desktop app I already know.
2. As a phone user, I want chat to work on the phone over the Logos network, so that I can message the same people I message on desktop.
3. As a phone user, I want the wallet, keystore and other first-party apps present without installing anything, so that the core experience is complete on first launch.
4. As a phone user, I want to browse the catalog on the phone, so that I can discover modules the same way I do on desktop.
5. As a phone user, I want to install a module from the catalog and launch it without updating the app, so that the platform stays open on mobile.
6. As a phone user, I want an installed module to use my chat, network and wallet modules through the normal permission flow, so that installed modules are as capable as on desktop.
7. As a phone user, I want to be asked before an installed module gets access to another module the first time, so that I control what a third-party module can reach.
8. As a phone user, I want a crashing installed module to take down only itself, so that the app and my other modules keep working.
9. As a phone user, I want to see clearly when a catalog module is not available on my phone and where it is available, so that I understand what I can and cannot install rather than hitting a broken install.
10. As a phone user, I want installed modules to remember their state across app restarts, so that I do not lose data or set things up again.
11. As a phone user, I want to uninstall a module and have its data removed, so that I can manage space and trust.
12. As a phone user, I want the app to stay responsive when several modules are installed, so that installing more does not make the phone unusable.
13. As a phone user, I want a module I am not looking at to stop consuming memory, so that the app survives in the background.
14. As a phone user, I want to report a module that misbehaves from its catalog entry, so that problems reach whoever can act on them.
15. As a phone user, I want to see who signed a module before installing it, so that I can decide whether to trust it.
16. As a phone user, I want typing into an installed module's text fields and scrolling its lists to feel native, so that installed modules do not feel like a second-class web page.
17. As a phone user, I want installed modules to look like the rest of the app, so that the experience is consistent.

### Module developer

18. As a module developer, I want to build my existing module for iOS and Android with one builder command, so that reaching phones does not require a new project.
19. As a module developer, I want the builder to produce the Bare module artifact for me, so that I never have to reason about frameworks, symbol visibility or linking rules.
20. As a module developer, I want to produce a `web` variant of my module from the same sources, so that my module can be installed at runtime on Store shells.
21. As a module developer, I want the builder to tell me at build time when my module cannot produce a `web` variant and why, so that I know what to change rather than discovering it on a device.
22. As a module developer, I want my module's dependencies on chat, delivery or libp2p to keep working in the `web` variant through the normal typed clients, so that I do not write a second networking path.
23. As a module developer, I want a storage abstraction my Rust core can use in both native and `web` builds, so that persistence is one code path.
24. As a module developer, I want to test my Bare module and my `web` variant on my desktop with `logoscore`, so that I do not need a device for every iteration.
25. As a module developer, I want to run my `web` variant inside the desktop Basecamp's Web container, so that I can see it in the real Shell before touching a phone.
26. As a module developer, I want the LGX package to carry all my variants with one signature, so that publishing is one step.
27. As a module developer, I want the catalog to show which variants my package ships, so that users see accurate availability.
28. As a module developer, I want per-image behaviour (token store, mode, statics) to hold inside the Wasm host as it does in a native plugin, so that my module's assumptions do not change between containers.
29. As a module developer, I want panics and hard faults inside my `web` variant to be reported as module failures rather than app crashes, so that my bugs stay mine.

### UI app developer

30. As a UI app developer, I want my QML view and its backend to run on the phone in the Bundled set, so that my app is part of a Store shell.
31. As a UI app developer, I want my QML and backend to run in the Web container as a Downloaded module, so that my app can be installed at runtime.
32. As a UI app developer, I want my backend to keep being remoted to the view over Qt Remote Objects in the Web container, so that I do not restructure the app.
33. As a UI app developer, I want the Logos design system available in the Web container, so that my app looks the same as on desktop.
34. As a UI app developer, I want `logos.callModuleAsync` and `logos.module(name)` to work unchanged from QML inside the Web container, so that my view code is portable.
35. As a UI app developer, I want app-to-app intents to work between a Downloaded app and Bundled apps, so that the intent vocabulary holds on mobile.
36. As a UI app developer, I want touch input, on-screen keyboard and safe-area behaviour handled by the container, so that I do not special-case mobile in QML.

### Shell and release engineer

37. As a release engineer, I want to build a Store shell from a list of app names and a pinned catalog release, so that the Bundled set is data, not code.
38. As a release engineer, I want the build to resolve the dependency closure of that list and fail loudly when a member lacks the target variant, so that I never ship a set that cannot load.
39. As a release engineer, I want every fetched package verified against its signature and Merkle root, so that the build is reproducible and supply-chain safe.
40. As a release engineer, I want the shell build to embed frameworks and write a manifest with no per-module code generation and no link step, so that adding an app to a build is a one-line change.
41. As a release engineer, I want the same `ws` command to target the iOS simulator, an iOS device, and Android ABIs, so that the workflow matches the existing Shell-preview runners.
42. As a release engineer, I want the iOS Qt in logos-nix to export the symbols Bare modules need, so that the Native container works from the nix pipeline rather than a patched Qt.
43. As a release engineer, I want the Qt-for-WebAssembly runtime and the Emscripten toolchain pinned in nix, so that the Web container's runtime is built and versioned like everything else.
44. As a release engineer, I want CI to exercise both containers on Linux and macOS through `logoscore`, so that regressions are caught without devices.
45. As a release engineer, I want an artifact gate that rejects a Bare module containing Qt or protocol symbols, so that a bad module build cannot reach a device.
46. As a release engineer, I want the Store shell to expose the catalog index with universal links, the report mechanism and the consent flow required by App Store guideline 4.7, so that submission is not blocked on policy.

### Status integrator

47. As a Status integrator, I want the Native container developed upstream in liblogos and consumable by the Status mobile app, so that Status does not fork the loader.
48. As a Status integrator, I want the wallet stack modules to run as Bundled modules on iOS with the same crash contract ADR 0007 describes, so that the Status mission's assumptions hold.
49. As a Status integrator, I want Status ADR 0007 amended to the Bare module shape (frameworks carry no Qt and no protocol), so that both teams build the same thing.

### Catalog and compliance

50. As a catalog maintainer, I want the variant vocabulary defined in one place and shared by `lgx`, `lgpm`, `lgpd` and the shell build, so that a variant name means the same thing everywhere.
51. As a catalog maintainer, I want each package's variants and their capability notes published in the index, so that shells and users can filter honestly.
52. As a compliance reviewer, I want Downloaded modules to reach only Logos module APIs through the bridge and never raw platform APIs, so that the app satisfies guideline 4.7.2.
53. As a compliance reviewer, I want per-module consent recorded and shown before any data crosses to a Downloaded module, so that the app satisfies guideline 4.7.3.

## Implementation Decisions

### Runtime and containers

- The phone runs a local liblogos core. No Remote core (ADR 0003).
- **Native container**: a new in-process `ModuleContainer` and matching loader registered through the existing `makeContainer` / `makeFormatLoader` seams before core start. Modules run on supervised threads in the app process; `LoadedModuleHandle` uses the documented in-process sentinel. Inter-module transport is `LogosMode::Local`, hardened for production (event delivery when the callee is not yet registered, a real entry point). Per-module identity uses the existing per-identity token stores (`admitConsumer`, `forIdentity`) instead of per-image stores. The container uses one generic host glue: dispatch through the module C ABI, contract read at runtime through `logos_module_get_methods`, no per-module generated glue.
- **Bare module** artifact (ADR 0006): logos-module-builder gains an output that stops at implementation plus Rust core, leaves `lp_*` symbols undefined, and packages it as the `ios-arm64` / `ios-sim-arm64` variant (embedded signed framework) and the `android-arm64` / `android-x86_64` variant (shared object in the app's native library directory). UI apps use the same contract: the framework holds the Qt backend and QML resources and binds Qt upward. The app image exports only a listed symbol set (spike: 65 KB cost). logos-nix builds the static iOS Qt with `reduce_exports` off for both iOS targets. The static registration table is not built.
- **Web container** (ADR 0004, 0005): a new container owning one webview per Downloaded module (WKWebView on iOS, WebView on Android, Qt WebEngine on desktop) and a `web` format loader mapping the `web` LGX variant onto it, setting the module's transport set to the web transport. The module's `web` variant is a **Wasm host**: the Bare module compiled to WebAssembly with logos-protocol compiled to wasm, running in a Web Worker, single-threaded. Its QML is rendered by one bundled Qt-for-WebAssembly QML runtime (Qt 6.11, single-threaded) with the Logos design system linked in. Backend-to-view remoting is Qt Remote Objects over a MessagePort transport registered through QtRO's scheme factory. HTML/JS module UIs are allowed.
- **Web transport**: a fourth `LogosProtocol` value carrying the plain transport's message types (Call, Result, Subscribe, Unsubscribe, Event, Token, Methods, MethodsResult) as JSON over the webview's message channel, without byte framing. The native side relays frames and attributes each to its webview; it never authorizes. `ModuleProxy` receives the transport tag "web". Tokens are minted by `capability_module` and validated by the module's own `ModuleProxy`. A browser JS SDK implements the same message shapes for HTML/JS modules and for the Wasm host's glue.
- **Runtime budget**: the QML runtime instance (185–240 MB, 2.6–3 s cold start per spike) is kept alive only for the visible Downloaded module; background Downloaded modules keep their Wasm host and drop their UI webview. The host owns a live-module budget and eviction policy.
- **Load path** in the Web container: `file://` is not used. On iOS a custom URL scheme handler serves the runtime and module bytes; runtime QML documents are delivered through JS fetch plus `createQmlObject` with a qrc base URL, or through an in-app loopback HTTP listener when Qt's network layer must fetch directly. Android uses the asset loader over https.
- **Web-platform capabilities** a module has inside its webview (fetch, WebSocket, WebRTC, IndexedDB/OPFS, WebCrypto) are used directly and never proxied through the bridge. The bridge exposes Logos module APIs only (guideline 4.7.2). Raw sockets and libp2p are not available to Web variants; networking is consumed as a service from the Bundled set.
- **Consent** (guideline 4.7.3) is a policy hook in `capability_module`'s `requestModule` path when either party is a Downloaded module, surfaced by the Shell.

### Packaging and catalog (ADR 0007)

- Variant vocabulary: `linux-*`, `darwin-*`, `windows-*`, `android-arm64`, `android-x86_64`, `ios-arm64`, `ios-sim-arm64`, `web`, defined once in logos-package and shared by every tool.
- A Store shell installs `web` variants only at runtime. Its Bundled set is assembled at build time from a list of app names against a pinned catalog release: resolve the dependency closure, fetch each package by Merkle root as a fixed-output derivation, verify the Ed25519 signature, extract the target variant, embed, and write a Bundled-set manifest the Native container reads at start. No per-module code generation, no link step.
- Rules: a Bundled module depends only on Bundled modules; everything first-party that opens sockets is Bundled; a module without a `web` variant is listed as unavailable on Store shells.
- The catalog index publishes each package's variants and per-variant capability notes, a universal link per module (4.7.4), and a report mechanism per module (4.7.1). The signer-trust prompt from the LGX signing design gates Downloaded installs.
- `ws build logos-basecamp --target <variant> --bundle <apps>` and the existing Shell-preview runners (`run-ios`, `run-ios-device`, Android APK) are the workspace entry points; dev builds keep working from workspace sources with local overrides.

### Shell

- The Shell is unchanged in contract (`IShellHost`, `IShellView`). The Basecamp host on mobile: runtime seam (`ICoreRuntime`) answered from the Bundled-set manifest plus the Web container's installed set; App Manager shows per-variant availability; catalog browsing through the existing package-manager and package-downloader modules; consent and report flows added as Shell sections.

## Testing Decisions

A good test drives the system from outside at a seam that already exists and asserts observable behaviour: a call returns the right value, an event arrives, a module reports the right state, an artifact has the right shape. Tests do not reach into container internals, token stores or framing code.

Seams, highest first:

1. **`logoscore` on desktop, both containers.** The in-process Native container and the Web container are not mobile-specific. `logoscore` gains container selection; tests load Bare modules and `web` variants of the existing test modules (logos-test-modules, the counter and QML modules) and exercise load, cross-module calls (sync and async), events, per-identity token isolation, unload with dependents, and failure reporting. Prior art: the `logoscore` invocation used throughout the developer guide and the test-modules doc-tests. This is where most tests live and runs on Linux and macOS CI.
2. **Protocol transport tests** for the web transport with an in-memory message-channel pair standing in for the webview, mirroring the plain TCP transport and `LogosMode` tests in logos-protocol; a browser JS SDK end-to-end mirroring the Node JS SDK's e2e (a provider and a consumer exchanging calls, an object result, a bytes round trip, introspection, an event).
3. **Runtime seam contract**: `ICoreRuntime` answered from a Bundled-set manifest, tested like Basecamp's fixture runtime.
4. **Artifact gates** in the builder: a Bare module contains no Qt and no protocol symbols and exports the module-impl ABI; a `web` variant contains the expected entry points; both modelled on the Android DT_NEEDED gate in logos-nix.
5. **Store shell build and launch**: the assembled app's embedded frameworks and manifest match the requested closure; a simulator launch shows the Shell listing the Bundled set and installing a `web` module from a local catalog; an Android emulator run does the same. Device runs (iPad, Samsung) are manual acceptance.

Modules under test: liblogos (containers, loader, manifest), logos-protocol (web transport, mode), logos-plugin-qt (generic host glue, identity admission), logos-module-builder (Bare and `web` outputs, gates), logos-package / package-manager / package-downloader (variants, index), logos-basecamp (mobile host, App Manager, consent), logos-nix (Qt export flags, Qt-wasm and Emscripten toolchain).

## Out of Scope

- Native Downloaded modules on any Store shell (forbidden by both stores). Native Downloaded modules on desktop and non-store Android keep working as today and are not changed here.
- A Remote core in any form.
- Patching Qt's iOS shared-library gate.
- A web (HTML/CSS) edition of the design system; HTML/JS module UIs are allowed but bring their own look.
- Multithreaded WebAssembly builds; the Web container is single-threaded.
- Browser-transport libp2p (WebSocket/WebRTC) inside `web` variants.
- Store submission itself, TestFlight external beta, Play listing, and app-store assets. The 4.7 features are built; the submission is a later milestone.
- Backgrounding regime and push notifications for modules.
- Porting every first-party module to a `web` variant; milestone 1 ports keystore and the wallet UI as the proof, with the storage abstraction they need.
- Status app integration beyond the ADR 0007 amendment and consuming the upstream container.

## Further Notes

- Decisions and their rationale are in ADR 0003–0007 on the docs branch; the glossary in CONTEXT.md is the vocabulary this PRD uses (Bundled module, Downloaded module, Native container, Web container, Bare module, Wasm host, Web bridge, Web variant, Store shell, Bundled set).
- Policy facts are cited in the iOS runtime-QML policy research; Qt-wasm constraints in the Qt-wasm research; both spike reports are under research/spikes. Spike code: the iOS dlopen spike on the `alexjba/logos-basecamp` fork (branch `spike/ios-dlopen-bare-module`); the Qt-wasm spike is a local repository.
- Known follow-ups from the spikes: verify the dlopen path against real logos-protocol in the host (the spike used a stand-in for one symbol); measure iPad WebContent memory once a wired device is available; decide whether the iOS loopback listener becomes the standard load path (it is the only way to get `crossOriginIsolated` on iOS, which matters only if threads are ever wanted).
- Working rules for this milestone: no upstream GitHub changes for now; branches go to `alexjba` forks only; no PRs until the owner says so; all submodules track master head when the workspace is bumped; no ADR numbers cited in repos that do not contain the ADR.
- Rough effort from the synthesis: about one quarter with two people for the Native side and the shell; the Web container side is comparable and can proceed in parallel now that its spike has passed.
