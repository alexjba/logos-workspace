# 01 · Bump logos-basecamp to master in the workspace

## What to build

The workspace pins basecamp at d68173f (2026-07-28), 67 commits behind master,
which is where the Shell preview (`shell-preview`), the Mock backend
(`app-mock`) and the `IShellHost` boundary live. Bump the pin to current master,
regenerate the follows graph, and absorb the new inputs basecamp gained
(`logos-plugin-qt`, `logos-module-loader-qt`, `logos-modules-state-module`).
This is a prefactor: every mobile slice builds on outputs that only exist on
master, and `--auto-local` overrides are only correct when the pin is current.

Land it as its own PR, separate from any mobile change. If the bump drags in
dependency updates that need fixes, those belong here too, not in the mobile
PRs.

## Acceptance criteria

- [ ] `flake.nix` / `flake.lock` pin basecamp at a master commit that contains `shell-preview/` and `mock/`; `ws sync-graph` output is committed.
- [ ] `ws build logos-basecamp` and `ws run logos-basecamp` succeed on aarch64-darwin.
- [ ] `nix run .#logos-basecamp--shell-preview` (or the workspace's equivalent non-default output naming) launches the Shell preview on desktop with fixture data.
- [ ] `ws test logos-basecamp` passes the checks that pass on basecamp master.
- [ ] `ws dirty` / `ws graph logos-basecamp` show the three new inputs resolved through the workspace follows.

## Blocked by

None - can start immediately.
