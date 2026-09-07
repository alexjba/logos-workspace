# 02 · Hello-QML APK on an Android device from a nix derivation

## What to build

The Android toolchain in logos-nix, proven end to end by a trivial QML app
that reaches a phone. This is spike A from the plan, shaped as a tracer bullet
so that a green spike is already a working pipeline.

In logos-nix: an Android cross package set (`aarch64-android` pseudo-system,
mirroring `x86_64-windows`) on the existing cross pin (`nixpkgs-windows`,
Qt 6.11.1), with Qt built from source via an overlay over nixpkgs' `qt6`
recipe; an `androidenv` composition (SDK, NDK, build-tools, platform-tools);
a host Qt at the same pin for the build platform; and
`logosQtCrossCmakeFlags` for the target (host tool paths, SDK/NDK roots,
ABI). Then a hello-QML `qt_add_executable` packaged into an APK inside a
derivation: `androiddeployqt` plus gradle running offline against a
`gradle.fetchDeps` lock, debug keystore generated in-derivation. Finally a
run script that installs the APK on the single attached device or emulator
and launches it.

The open question the slice answers: how much of nixpkgs' qtbase recipe has
to be stripped for an Android host, and whether `qtdeclarative`,
`qtshadertools` and `qtsvg` follow without patches. If the overlay becomes a
fork of nixpkgs, do it the way mingw was done (`logos-co/nixpkgs` branch)
and record why.

Only `arm64-v8a` in this slice; the other ABIs come in slice 09.

## Acceptance criteria

- [ ] `nix build github:logos-co/logos-nix#packages.aarch64-android.qt6.qtbase` (and `qtdeclarative`, `qtshadertools`, `qtsvg`) succeeds from **aarch64-darwin** and from **x86_64-linux** (WSL, strict sandbox); both are pure derivations with no `__noChroot`.
- [ ] Wall-clock build time and closure size of the Qt set recorded in the PR for both build platforms.
- [ ] The hello-QML APK is a derivation output (`$out/*.apk`) on both build platforms; gradle runs `--offline` with a committed lock and its `updateScript` is documented.
- [ ] The APK built on either platform installs and shows the QML window on a physical arm64 Android device and on an Apple-Silicon emulator image.
- [ ] `nix run` of the hello app installs and launches on the single attached device; a clear error when zero or several devices are attached.
- [ ] `pkgs.logosQtCrossCmakeFlags` evaluates to the Android flags under the cross set and to `[]` natively, so basecamp's existing nix files consume it unchanged.
- [ ] README section in logos-nix: how the Android set is composed and how to add an ABI.

## Blocked by

None - can start immediately. Runs in parallel with 03.
