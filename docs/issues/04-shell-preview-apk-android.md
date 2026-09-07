# 04 · Shell preview APK on an Android device

## What to build

The real thing on Android: the Shell preview (the shipped Shell plugin against
the fixture, no Logos code) as an APK built by nix and launched on a phone
with `nix run`, from the basecamp repo.

Under the `aarch64-android` package set: logos-design-system (QML-only static
modules) and basecamp's `main_ui` Shell plugin cross-build with the flags
from slice 02. The Shell host stays the existing `shell-preview` executable
(decision D2: widget-shaped host as-is); it gains Android packaging metadata
(manifest, icon, `libmain_ui.so` declared as an extra library so
`androiddeployqt` ships it), resolves the plugin from the app's native
library directory instead of `../plugins/`, and shows full-screen. A
`shell-preview-android` derivation packages it exactly like the hello app in
slice 02, with its own committed gradle lock. An `apps.run-android` entry
installs and launches it.

The Shell is loaded dynamically with `QPluginLoader` here, same as desktop
(ADR 0001).

## Acceptance criteria

- [ ] `nix build .#packages.aarch64-android.shell-preview-android` (naming per the Windows precedent) produces an APK from aarch64-darwin and from x86_64-linux (WSL).
- [ ] `nix run .#run-android` installs and launches it on the single attached device; on the phone the sidebar, App Manager and Settings render with fixture data and the "Dev build (Mocked)"-style marker is visible.
- [ ] The same APK runs on an Apple-Silicon Android emulator.
- [ ] The APK contains no Logos library (no `liblogos_*`, no `logos_protocol`), verified by listing its `lib/` in CI or in the derivation.
- [ ] logos-design-system exposes `packages.aarch64-android.default` with no CMake change (or the change is justified in the PR).
- [ ] Screenshots from device and emulator in the PR.

## Blocked by

- 01 (basecamp pin has `shell-preview`)
- 02 (Android toolchain and APK derivation pattern)
