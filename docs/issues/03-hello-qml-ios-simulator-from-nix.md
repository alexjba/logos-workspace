# 03 · Hello-QML app on the iOS simulator from nix-built static Qt

## What to build

The iOS toolchain in logos-nix, proven by a trivial QML app running on the
simulator. This is spike B from the plan as a tracer bullet.

In logos-nix: an `aarch64-ios-simulator` cross package set on the shared
cross pin, with Qt 6.11.1 built from source as static frameworks (Qt's only
option on iOS; see ADR 0001) inside `__noChroot` derivations (ADR 0002); an
Xcode wrapper that symlinks the needed Xcode tools and fails the build when
the installed Xcode version differs from the one it was declared with, with
that version part of the derivation name so it is in every dependent hash; a
host Qt at the same pin; `logosQtCrossCmakeFlags` for the target. Then the
impure half: a `nix run` app that configures a hello-QML `qt_add_executable`
with the Xcode generator against the store Qt, builds it with `xcodebuild`
(no signing on the simulator), and boots/installs/launches it with
`xcrun simctl`.

The open question the slice answers: whether Qt's iOS configure
(`-platform macx-ios-clang -sdk iphonesimulator -qt-host-path`) tolerates
nix's cc-wrapper on PATH, or whether the derivation must bypass stdenv's
compiler and use Xcode's clang and `xcrun` directly. If from-source fails
inside the time box, fall back to Qt's official iOS archives as fixed-output
fetches behind the same `packages.<pseudo-system>.qt6` interface and record
why.

## Acceptance criteria

- [ ] `nix build .#packages.aarch64-ios-simulator.qt6.qtbase` (plus `qtdeclarative`, `qtshadertools`, `qtsvg`) succeeds on aarch64-darwin with default `sandbox = false`; documented that `sandbox = relaxed` is required where a strict sandbox is enabled.
- [ ] Output is static `.framework` bundles; `file` on `QtCore.framework/QtCore` reports an archive.
- [ ] Changing the declared Xcode version changes the derivation hash; running with a mismatched installed Xcode fails early with a message naming both versions.
- [ ] Wall-clock build time and closure size recorded in the PR.
- [ ] `nix run` of the hello app builds with the Xcode generator outside the sandbox and launches on a booted arm64 simulator; boots a default simulator when none is running.
- [ ] `pkgs.logosQtCrossCmakeFlags` evaluates to the iOS flags under the cross set.
- [ ] README section in logos-nix: the purity boundary, the Xcode gate, and the prebuilt fallback.

## Blocked by

None - can start immediately. Runs in parallel with 02.
