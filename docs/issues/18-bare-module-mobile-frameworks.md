# 18 · Bare module as an iOS embedded framework and an Android shared object, loaded on devices

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 18, 41.
Repos, landing order: logos-nix (13) -> logos-module-builder -> logos-basecamp (host).

## What to build

The builder's cross set produces the `ios-arm64`, `ios-sim-arm64`,
`android-arm64` and `android-x86_64` Bare variants (framework bundle with
Info.plist for iOS, `.so` for Android), packaged into the module's LGX. A
shell-preview-style host app built from the nix static-Qt pipeline embeds the
counter framework (code-sign-on-copy), exports its symbol list, and loads it
through the Native container on launch; on Android the `.so` is loaded from
the app's native library directory.

## Acceptance criteria

- [ ] `nix build .#packages.aarch64-ios.bare` (and the sim/Android equivalents) for the counter produce artifacts the gate accepts.
- [ ] The host app on the iPhone simulator, the iPad Air (signed, team 8B5X2M6H2Y) and the Samsung device loads the counter through the Native container and shows the result of `add(1,2)`; no dyld/AMFI/codesign error in device logs.
- [ ] dlopen time per image is logged and stays in the tens of milliseconds on device.
- [ ] Frameworks are inside `<App>.app/Frameworks/` and signed with the app identity; the archive validates with `codesign --verify --deep`.

## Blocked by

- 13
- 15
- 16
