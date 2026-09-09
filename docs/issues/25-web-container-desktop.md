# 25 · Web container and `web` format loader on desktop, driven by `logoscore --container web`

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 25, 44.
Repos, landing order: logos-liblogos -> logos-module-loader (web loader package) -> logos-logoscore-cli.

## What to build

A Web container (one Qt WebEngine view per module on desktop, hidden for
headless modules) and a `web` format loader mapping an LGX `web` variant onto
it, registered through the factory seams. The loader sets the module's
transport set to `[{web}]`; the container binds the transport's channel to the
webview's message bridge (WebChannel on desktop) and relays frames, attributing
each to its webview. First module is an HTML/JS provider built with slice 24.
`logoscore --container web` loads it and calls it.

## Acceptance criteria

- [ ] `logoscore --container web -m <dir> -l js_counter -c "js_counter.add(1,2)"` prints 3 on macOS and Linux CI (offscreen WebEngine).
- [ ] The module's `requestModule` flow completes through capability_module running natively; tokens are validated inside the webview provider.
- [ ] Killing the webview process marks the module Failed and the core reports it; other modules unaffected.
- [ ] A native module can subscribe to an event emitted by the web module and vice versa.

## Blocked by

- 23
- 24
