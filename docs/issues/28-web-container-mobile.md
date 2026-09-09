# 28 · Web container on iOS and Android with the live-runtime budget

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 8, 12, 13, 16, 17.
Repos, landing order: logos-basecamp (mobile host).

## What to build

The mobile Basecamp host implements the Web container with WKWebView on
iOS (custom URL scheme handler serving runtime and module bytes, JS fetch or
in-app loopback for runtime QML documents) and WebView with the asset loader
on Android, binding the web transport to the platform message bridges. One
webview per Downloaded module; the QML runtime is alive only for the visible
module, background modules keep their Wasm host and drop the UI webview; the
host enforces a live-module budget with eviction. The counter UI `web`
variant runs on the simulator, the iPad and the Samsung.

## Acceptance criteria

- [ ] The counter UI `web` variant renders on all three; keyboard input into its text field and list scrolling work.
- [ ] Switching to a second Downloaded module releases the first's UI webview; memory of the app returns to within a stated budget, logged.
- [ ] A Downloaded module's Wasm host keeps answering calls while its UI is evicted.
- [ ] No `file://` loads; no listening port unless the loopback path is chosen, and then it is bound to localhost with a per-launch token.
- [ ] Cold start of a Downloaded module's UI is logged against the spike baseline (2.6–3 s).

## Blocked by

- 20
- 27
