# 27 · Qt-wasm QML runtime in nix and a `ui_qml` app's `web` variant rendered in the Web container

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 31, 32, 33, 34, 43.
Repos, landing order: logos-nix (Qt wasm from source) -> logos-design-system -> logos-view-module-runtime (MessagePort QtRO) -> logos-module-builder -> logos-liblogos.

## What to build

Qt 6.11 for WebAssembly, single-threaded, built from source in nix with
the design system linked in, packaged as the bundled QML runtime the Web
container serves. A `ui_qml` app's `web` variant: its backend runs inside the
Wasm host (slice 26), its QML is loaded by the runtime at install time, and
the two are joined by Qt Remote Objects over a MessagePort IO device
registered with QtRO's scheme factory. `logos.callModuleAsync` and
`logos.module(name)` work from that QML. Shown in the desktop Web container.

## Acceptance criteria

- [ ] The Qt-wasm runtime derivation builds on x86_64-linux and aarch64-darwin; size (raw, brotli) logged against the spike's 26 MB / 6.8 MB.
- [ ] The counter UI's `web` variant renders in desktop Basecamp's Web container with the Logos look; the button drives the backend through the replica; a property change updates the view.
- [ ] `logos.callModuleAsync` from that QML reaches a native module through the bridge.
- [ ] The same runtime serves a second module's QML without a second runtime download.

## Blocked by

- 26
