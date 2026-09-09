# 09 · Android CI: APK built on Linux, all four ABIs cached

## What to build

Make Android repeatable for everyone. In logos-nix, the remaining ABIs
(`armeabi-v7a`, `x86`, `x86_64`) as pseudo-systems built the same way as
`arm64-v8a`. In basecamp, a `build-android` GitHub Actions job on Linux that
builds the Shell preview APK, uploads it as an artifact, and pushes the
closure (toolchain included) to the Logos cache via the existing
`setup-nix-cache-action`, so developers build Qt zero times. The gradle lock
refresh procedure is wired as a documented script, not tribal knowledge.

## Acceptance criteria

- [ ] `packages.<abi>-android.qt6.*` exist for all four ABIs and build on x86_64-linux and aarch64-darwin.
- [ ] Basecamp master CI produces `shell-preview-android` APK as an artifact on `ubuntu-latest` (or the arm runner) and the run pushes to the cache.
- [ ] A fresh machine with the cache configured (`nix run .#run-android` on the dev Mac after `nix store gc` of the toolchain, and on WSL) downloads the Qt closure instead of building it; the time is recorded in the PR.
- [ ] A multi-ABI or per-ABI APK choice is made and documented (default stays `arm64-v8a` for `ws run`).
- [ ] `mitmCache` lock refresh is a one-command script referenced from `MOBILE-HANDOFF.md`.

## Blocked by

- 04
