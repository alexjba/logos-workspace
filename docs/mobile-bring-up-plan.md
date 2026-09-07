# Basecamp mobile bring-up: Shell preview on Android and iOS

Status: draft, 2026-09-07. Decisions below were taken in a planning session;
the two ADRs in `docs/adr/` record the ones that are hard to reverse.
Vocabulary: `CONTEXT.md`. Ticket drafts: `docs/issues/`.

## 1. Goal

Milestone 1 of the mobile track: the Basecamp **Shell preview** (the real Shell
plugin against a Fixture, no Logos code) runs on an Android device and on an
iOS simulator/device, built through nix, launched with one workspace command.

Out of scope for this milestone, in order of what follows it:

- 1b. A QML-root Shell host over `QGuiApplication` + `QQuickWindow` (mobile-shaped
  UI). The Shell contract (`IShellView::createShell` returns `QWidget*`) is
  desktop-shaped today; milestone 1 runs it as-is.
- 2. Logos runtime on mobile (in-process container, Status ADR 0007), which is
  what would let the Mock backend tier and real UI apps run on device.
- 3. Status integration.
- Signed release artifacts / store distribution (fastlane track).

## 2. Why Shell preview and not the Mock backend

| | Mock backend (`app-mock`) | Shell preview (`shell-preview`) |
|---|---|---|
| Module runtime | fixture | absent |
| logos-protocol / qt-host | shipped | absent |
| `ui-host` subprocess | spawned | absent |
| UI apps (PMUI) | load, real code | do not load |
| SDK code generation | yes | no |
| Survives iOS (no fork/exec, no dlopen of Qt plugins) | no | yes |

Basecamp's own docs designate `shell-preview` as the mobile starting point.
Cost: milestone 1 shows sidebar, App Manager and Settings; the Package Manager
app pane stays empty.

## 3. Dependency analysis: what a Shell preview needs on a phone

Closure of `basecamp-shell-preview` today (desktop):

| Component | Kind | Mobile note |
|---|---|---|
| Qt 6: Core, Gui, Widgets, Quick, Qml, QuickWidgets, QuickControls2 | linked | `QQuickWidget` and widgets are supported on Android/iOS; not pretty, fine for bring-up |
| Qt QML runtime modules: QtQuick, Controls (Basic style), Layouts, Effects, Window, QtCore | runtime | Effects needs `qtshadertools` at build (host `qsb`) |
| Qt Svg image format plugin | runtime | 5 SVG icons in the Shell |
| Qt platform plugin | runtime | `qtforandroid` (shared) / `qios` (static) |
| logos-design-system (`Logos.Theme/.Icons/.Controls`) | static QML modules, QML-only | cross-compiles with no source change; needs host `qmltyperegistrar`/`qmlcachegen` |
| `main_ui` Shell plugin + its 7 static QML modules | plugin (`.so`/`.dylib`) | Android: `libmain_ui.so` in the APK, `QPluginLoader`. iOS: static import (ADR 0001) |
| `app/interfaces/*.h` | headers | unchanged |
| `shell-fixture.json` | resource | unchanged |

Nothing Logos-specific is in the closure. What is missing entirely:

| Need | Android | iOS |
|---|---|---|
| Qt built for the target | nixpkgs has none | nixpkgs has none |
| SDK / toolchain | `androidenv` (SDK, NDK, build-tools, platform-tools) in nixpkgs, aarch64-darwin supported | Xcode, impure by nature |
| Host Qt tools at the same version | `moc`, `rcc`, `qmltyperegistrar`, `qmlcachegen`, `qsb`, `androiddeployqt` | same, plus Xcode generator for the app |
| App packaging | `androiddeployqt` + gradle (Java bridge must compile) | `xcodebuild` link + sign |
| Deploy | `adb` | `xcrun simctl` / `xcrun devicectl` |

## 4. Decisions

| # | Decision | Alternative rejected | Where recorded |
|---|---|---|---|
| D1 | Target tier: Shell preview | Mock backend (ui-host subprocess, dlopen) | this doc |
| D2 | Run the existing widget-shaped host as-is; QML-root host is milestone 1b | refactor Shell first | this doc |
| D3 | Qt from source in nix for both Android and iOS, on the existing `nixpkgs-windows` pin (Qt 6.11.1), which becomes the shared cross pin | prebuilt `aqt` archives (kept as iOS fallback); a third `nixpkgs-mobile` pin | this doc |
| D4 | iOS derivations are `__noChroot`, gated on Xcode version; link+sign is a `nix run` step, not a derivation | hermetic SDK-in-store; impure derivations; script outside nix | ADR 0002 |
| D5 | Shell is a dynamic plugin on Android, statically imported on iOS (Qt for iOS is static-only, hard gate in `qt_auto_detect_apple`) | static on both; patching Qt's gate (spike, see §7) | ADR 0001 |
| D6 | Ownership: logos-nix = toolchains as pseudo-systems; basecamp = host, packaging, run apps; workspace = `ws run --target` | dedicated `logos-mobile` repo | this doc |
| D7 | Toolchain suite: all four Android ABIs and both iOS SDKs | arm64 only | this doc |
| D8 | Step 0: bump basecamp pin in the workspace | develop against basecamp master only | this doc |
| D9 | Mobile host lives in `shell-preview/` with `platform/android`, `platform/ios` | new `mobile/` tree | this doc |
| D10 | Android APK is a pure derivation; gradle offline via nixpkgs `gradle.fetchDeps` / `mitmCache` | hand-curated maven `deps.json` (legacy); bypass gradle | this doc |
| D11 | `ws run logos-basecamp --target android\|ios-sim\|ios-device`; auto-pick single device, `--device` otherwise; `ios-device` needs `LOGOS_IOS_TEAM_ID` | implicit fallback sim→device | this doc |
| D12 | CI build-only; cache push is a hard requirement; no logos-nix CI (basecamp jobs build toolchains as dependencies, like Windows) | emulator smoke test in CI | this doc |

## 5. Target architecture

### 5.1 logos-nix

Mirrors the Windows layout. `forAllTargets` grows three pseudo-systems keyed
like `x86_64-windows`:

| Pseudo-system | crossSystem | Build platforms |
|---|---|---|
| `aarch64-android` (+ `armv7a-android`, `x86_64-android`, `i686-android` for the full suite) | `aarch64-unknown-linux-android`, `useAndroidPrebuilt` | x86_64-linux, aarch64-darwin |
| `aarch64-ios` | `arm64-apple-ios`, `iphoneos` SDK | aarch64-darwin only |
| `aarch64-ios-simulator` | `arm64-apple-ios-simulator`, `iphonesimulator` SDK | aarch64-darwin only |

Each package set provides:

- `qt6.{qtbase,qtdeclarative,qtshadertools,qtsvg,qtimageformats?}` cross-built
  from the nixpkgs `qt6` recipe on the cross pin, via
  `nix/android/cross-overlay.nix` and `nix/ios/cross-overlay.nix`. Android:
  shared libs, per ABI. iOS: static frameworks (Qt's only option).
- `logosQtCrossCmakeFlags` for the target: `QT_HOST_PATH`,
  `QT_ADDITIONAL_HOST_PACKAGES_PREFIX_PATH`, plus Android
  (`ANDROID_SDK_ROOT`, `ANDROID_NDK_ROOT`, `QT_ANDROID_ABIS`) or iOS
  (`CMAKE_OSX_SYSROOT`, `QT_HOST_PATH`) extras. Basecamp's nix files already
  consume this variable.
- `androidPkgs` (composed `androidenv`), `xcodeWrapper` (symlinks into
  `/Applications/Xcode.app`, version-gated; the version string is part of the
  derivation name so it is in every dependent hash).
- A host Qt at the same pin for the build platform (needed for tools; the
  native workspace Qt is 6.9.2 and cannot serve).

Build platforms to verify every toolchain slice on: aarch64-darwin (dev Mac)
and x86_64-linux (WSL host `evo-wsl`: Determinate Nix 2.35, strict sandbox,
32 cores / 30 GB) for Android; aarch64-darwin only for iOS. Windows is not a
Logos build platform.

### 5.2 logos-design-system

Evaluates under the cross package sets; `packages.<pseudo-system>.default`.
Expected changes: none in CMake; possibly a `systems` list extension in its
flake mirroring how it handles Windows.

### 5.3 logos-basecamp

- `nix/main-ui.nix` under the cross set → `libmain_ui.so` (Android) or
  `libmain_ui.a` + static QML module archives (iOS).
- `shell-preview/`:
  - `src/main.cpp`: `#if defined(Q_OS_IOS)` → `Q_IMPORT_PLUGIN(MainShellView)`
    and `QPluginLoader::staticInstances()`; else the existing path with
    `libmain_ui.so` resolved from the native library dir on Android.
    `QMainWindow::showFullScreen()` on mobile.
  - `CMakeLists.txt`: `QT_ANDROID_PACKAGE_SOURCE_DIR`, `QT_ANDROID_EXTRA_LIBS`
    for `libmain_ui.so`; `MACOSX_BUNDLE_INFO_PLIST`, bundle id, on iOS the
    static link of `main_ui` and its `WHOLE_ARCHIVE` QML plugin archives.
  - `platform/android/`: `AndroidManifest.xml`, `res/`, gradle lock
    (`gradle.fetchDeps` data). `platform/ios/`: `Info.plist.in`, assets.
- `nix/shell-preview-android.nix`: cross build with Ninja, then
  `androiddeployqt` + gradle `--offline` with `mitmCache`, debug keystore
  generated in-derivation. Output: `$out/*.apk`. Pure.
- `nix/shell-preview-ios.nix`: cross build of static libs only (Ninja). Output:
  static archives + a generated CMake/Xcode project input. `__noChroot`.
- `apps.<system>.run-android`, `run-ios-sim`, `run-ios-device`: scripts that
  build the package, then `adb install -r` + `am start`, or run
  `xcodebuild` (Xcode generator, automatic signing) against the store
  artifacts, then `simctl boot/install/launch` or `devicectl device install/
  process launch`. Impure by design.
- CI: `build-android` job on Linux (APK to artifacts, closure to cache);
  iOS simulator build on the macOS Jenkins agent (GH Actions has no macOS job
  today; `ci/macos.Jenkinsfile` is where macOS builds live).
- `MOBILE-HANDOFF.md`: the document the README already links to.

### 5.4 logos-workspace

- `ws run <repo> --target android|ios-sim|ios-device [--device <id>]`: maps to
  the pseudo-system, applies `--auto-local` overrides, runs the repo's app.
- `ws build <repo> --target <t>`: `packages.<pseudo-system>.<default>`.
- `ws sync-graph`: knows the new pseudo-systems.
- Docs: `CLAUDE.md` gets the new flags.

## 6. Phases and tickets

Estimates are omitted until the spikes (§7) close.

### Phase 0: prerequisite

- T0.1 Bump `logos-basecamp` to master in the workspace (`ws sync-graph`),
  absorb new inputs (`logos-plugin-qt`, `logos-module-loader-qt`,
  `logos-modules-state-module`). Own PR.

### Phase 1: toolchains (logos-nix)

- T1.1 Rename/introduce the shared cross pin (`nixpkgs-windows` → used by
  mobile too; keep the attribute name or alias it, do not bump it here).
- T1.2 Spike A: Android Qt cross overlay for `aarch64-android` (see §7).
- T1.3 Spike B: iOS Qt from source for `iphonesimulator` (see §7).
- T1.4 Generalize A to all four ABIs; B to `iphoneos`.
- T1.5 `logosQtCrossCmakeFlags` for each target; `androidPkgs`; `xcodeWrapper`
  with version gate.
- T1.6 `forAllTargets` pseudo-systems and `packages.<pseudo-system>.qt6`.

### Phase 2: Android pipeline

- T2.1 logos-design-system builds under `aarch64-android`.
- T2.2 basecamp `main-ui` builds under `aarch64-android`.
- T2.3 shell-preview host: Android packaging metadata, `main.cpp` changes,
  `QT_ANDROID_EXTRA_LIBS`.
- T2.4 `shell-preview-android` derivation: `androiddeployqt` + gradle offline
  (`gradle.fetchDeps` lock committed), debug keystore.
- T2.5 `apps.run-android`: install + launch on the single attached device.
- T2.6 `ws run --target android` / `--device`.
- T2.7 Manual verification on a physical arm64 device and the emulator;
  screenshots in the PR.

### Phase 3: iOS pipeline

- T3.1 logos-design-system under `aarch64-ios-simulator` (static).
- T3.2 basecamp `main-ui` static under the same.
- T3.3 shell-preview host: static import on iOS, `Info.plist.in`, bundle id.
- T3.4 `shell-preview-ios` derivation (static libs, `__noChroot`).
- T3.5 `apps.run-ios-sim`: xcodebuild link (Xcode generator) → `simctl`.
- T3.6 `apps.run-ios-device`: automatic signing with `LOGOS_IOS_TEAM_ID` →
  `devicectl`. Repeat T3.1–T3.4 for `aarch64-ios`.
- T3.7 `ws run --target ios-sim|ios-device`.
- T3.8 Manual verification on simulator and a physical iPhone.

### Phase 4: suite, CI, docs

- T4.1 Remaining Android ABIs and `iphoneos` toolchains built and cached.
- T4.2 basecamp CI: Linux `build-android` job pushing the closure; macOS
  Jenkins stage for the iOS simulator build.
- T4.3 `MOBILE-HANDOFF.md`; workspace `CLAUDE.md`; logos-nix README.
- T4.4 Follow-up tickets filed: 1b QML-root host; ADR 0007 iOS
  static-vs-dynamic spike; fastlane/release track; Linux emulator CI.

## 7. Spikes (time-boxed, one week each, in parallel)

### Spike A: nixpkgs `qt6` cross-configured for Android

Question: how much of the nixpkgs qtbase recipe (X11, fontconfig, libGL,
dbus, cups inputs and their `configure` flags) must be stripped or replaced
in an overlay for `aarch64-unknown-linux-android`, and does `qtdeclarative`
follow without its own patches.

Exit criteria:
- `qt6.qtbase`, `qtdeclarative`, `qtshadertools`, `qtsvg` build for
  `aarch64-android` from the cross pin.
- A hello-QML app built with `logosQtCrossCmakeFlags` links, and
  `androiddeployqt` produces an APK inside a derivation with gradle offline.
- Build time and closure size recorded.

Fallback if it fails: a logos-co nixpkgs branch carrying the changes, as was
done for mingw (`logos-co/nixpkgs@mingw-integration`).

### Spike B: Qt for iOS simulator from source inside nix

Question: can Qt's iOS configure (`-platform macx-ios-clang -sdk
iphonesimulator -qt-host-path`) run in a `__noChroot` derivation on
aarch64-darwin when nix's cc-wrapper is on `PATH`, or must the derivation
drop stdenv's compiler and use Xcode's clang and `xcrun` directly.

Exit criteria:
- Static frameworks for `iphonesimulator` in `$out`, built with a host Qt at
  the same pin.
- `qt-cmake` from that install configures a trivial `qt_add_executable` with
  the Xcode generator outside nix, and it runs on the simulator.
- Xcode version change → different derivation hash (gate proven).

Fallback if it fails: Qt's official iOS archives as fixed-output fetches
behind the same `packages.<pseudo-system>.qt6` interface; no consumer change.

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Qt Android cross needs deep nixpkgs surgery | Phase 1 slips | Spike A; nixpkgs fork branch fallback |
| Qt iOS configure incompatible with nix stdenv | Phase 1 slips | Spike B; prebuilt fallback |
| gradle offline lock churns on every Qt/AGP bump | maintenance | `mitmCache.updateScript` documented in `MOBILE-HANDOFF.md` |
| `QQuickWidget` misbehaves on iOS/Android (rendering, input) | UI unusable but pipeline still proven | acceptable for milestone 1; 1b removes widgets |
| Xcode-version cache poisoning | wrong binaries from cache | version in derivation name (ADR 0002) |
| Basecamp pin bump drags dependency updates | Phase 0 grows | it is the same nightly-bump chore; keep it separate from mobile PRs |
| ADR 0007's iOS framework plan is blocked by static Qt | milestone 2 design | flagged; spike ticket in T4.4 |
| macOS CI is Jenkins-only | iOS CI is not in GH Actions | accept; Jenkins stage in T4.2 |

## 9. Definition of done

1. `ws run logos-basecamp --target android` on a physical arm64 device, and
   `--target ios-sim` and `--target ios-device`, each launch the Shell preview
   with sidebar, App Manager and Settings populated from the fixture.
2. Basecamp CI builds the APK (Linux) and the simulator `.app` (macOS Jenkins)
   on master, and `cache.nix.logos.co` carries the mobile toolchains.
3. `MOBILE-HANDOFF.md` exists and states what is in, what is out, and why.

## 10. References

- basecamp `shell-preview/README.md`, `mock/README.md`, `README.md` §Mock
  Backend / UI-only Preview (master).
- basecamp `qt-ios/` (Dec 2025 impure experiment; superseded by this plan).
- logos-nix `flake.nix`, `nix/windows/cross-overlay.nix` (master): the
  pseudo-system and overlay pattern being mirrored.
- status-legacy `nix/mobile/*`, `nix/pkgs/xcodeenv`, `scripts/run-*.sh`:
  prior art for pure Android APK derivations, `__noChroot` iOS builds,
  gradle offline, and one-command run scripts.
- status-desktop `mobile/` and `docs/adr/0007-in-process-logos-module-execution-on-mobile.md`.
- Qt: [Building from source for iOS](https://doc.qt.io/qt-6/ios-building-from-source.html),
  `qtbase/cmake/QtAutoDetectHelpers.cmake` (`qt_internal_ensure_static_qt_config`).
- basecamp issues #119 (Android), #120 (iOS), epic #89.
