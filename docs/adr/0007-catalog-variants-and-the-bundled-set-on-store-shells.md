# One catalog with per-platform variants; a Store shell installs `web` at runtime and bundles native mobile variants at build time; the networking stack is always Bundled

A module publishes which variants it ships: desktop natives, `android-arm64`
/ `android-x86_64`, `ios-arm64` / `ios-sim-arm64`, and `web`. A Store shell
(App Store or Google Play build) installs only `web` variants at runtime; its
Bundled set is assembled at build time by pulling the signed native mobile
variants from the same catalog, so the catalog is the single source for both
paths and a native mobile variant is never a runtime download. Desktop and
non-store Android shells install native variants too. Two rules keep the sets
consistent: a Bundled module may depend only on Bundled modules (core
auto-loads dependencies and a build-time set cannot reach a runtime one), and
everything first-party that opens sockets (libp2p, delivery, chat backend) is
always in the Bundled set, because a webview has no raw TCP/UDP and proxying
sockets to a plug-in is what App Store guideline 4.7.2 forbids. Downloaded
modules reach the network through those services over the Web bridge.

## Consequences

- The catalog lists every module on every shell, with per-variant
  availability shown honestly ("available on desktop, not in this build")
  rather than hiding native-only modules.
- Guideline 4.7 obligations become catalog features on Store shells: an index
  with a universal link per module, a report mechanism per module, per-module
  consent, and a signer-trust gate since the host is liable for every plug-in
  it lists.
- On non-store Android, native Downloaded modules are gated by LGX signatures
  and signer trust alone; there is no store review behind them.
- A Downloaded module that ships its own p2p stack in a `web` variant is
  limited to browser transports (WebSocket, WebRTC, WebTransport); the
  platform does not promise that path.
