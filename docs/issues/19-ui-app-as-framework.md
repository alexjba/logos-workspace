# 19 · A `ui_qml` app's iOS variant as a framework, loaded into the app's QML engine

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 30, 36.
Repos, landing order: logos-module-builder -> logos-plugin-qt (view plugin base) -> logos-basecamp.

## What to build

A `ui_qml` app (the QML counter UI from test-modules) builds as an iOS
framework holding its Qt backend (generated view plugin base, `.rep` source)
and QML resources, binding Qt upward into the app image. The Native container
loads it, the host instantiates the view object in-process (no `ui-host`
subprocess on iOS), and the QML view renders in the host's engine bound to
the backend through the in-process replica path.

## Acceptance criteria

- [ ] The counter UI's iOS variant passes the artifact gate (no Qt inside; Qt symbols undefined).
- [ ] On the simulator and the iPad the host shows the counter UI, its button drives the backend, and the backend's property change updates the view.
- [ ] The desktop `ui-host` subprocess path is untouched; the same app still loads on desktop Basecamp.
- [ ] QML load time from the framework's resources is logged (spike baseline 14 ms).

## Blocked by

- 18
