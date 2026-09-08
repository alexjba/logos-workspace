# 12 · Fold the basecamp Android workarounds into `mkQtAndroidApk`

## What to build

The first real consumer of `pkgs.mkQtAndroidApk` (basecamp's Shell preview, slice 04) needed `overrideAttrs` and a hand-written `if(ANDROID)` block that the function should own: shipping extra native libraries, declaring QML root paths, and a merged Qt prefix visible at configure time so plugin CMake packages (`Qt6QSvgPlugin`) resolve without hand-deploying them. Move these into the function so the device slice and basecamp's real app do not repeat them.

Interface from the review of slice 04: `extraLibs` (paths for `QT_ANDROID_EXTRA_LIBS`, their DT_NEEDED folded into module resolution), `qmlRootPaths`, the merged Qt prefix built in `preConfigure` with `CMAKE_PREFIX_PATH` pointed at it, `projectDir` (replaces the `setSourceRoot` override), `forbiddenLibs` / `requiredLibs` (replaces the consumer's postInstall gate), and `passthru.runner` (the install-and-launch script every consumer re-implements).

## Acceptance criteria

- [ ] basecamp's `nix/shell-preview-android.nix` and its `if(ANDROID)` CMake block shrink to declarations only; no `overrideAttrs`, no hand-deployed Qt plugins.
- [ ] `checks.x86_64-linux.android-apk` in logos-nix exercises `extraLibs` and `forbiddenLibs`.
- [ ] `nix run .#run-android` in basecamp uses the function's runner.
- [ ] Android Qt derivation hashes unchanged.

## Blocked by

- 04 landed (logos-basecamp draft PR for the Android Shell preview)
