# 05 · `ws run logos-basecamp --target android`

## What to build

The one command, from the workspace. `ws run` and `ws build` accept
`--target android` (later `ios-sim`, `ios-device`), map it to the pseudo-system
the repo's flake exposes, keep `--auto-local` / `--local` overrides working
exactly as for native builds (the follows graph is unchanged; only the
package set differs), and invoke the repo's run app. `--device <serial>`
selects among several attached devices; with one attached, no flag is
needed; with none, a clear error. `ws sync-graph` must not break on repos
that expose pseudo-systems, and `ws graph` / `ws dirty` stay accurate.

## Acceptance criteria

- [ ] `ws run logos-basecamp --target android` builds (or fetches from cache) and launches the Shell preview on the attached device, from the workspace root, with no other setup than `export PATH=.../scripts`.
- [ ] `ws run logos-basecamp --target android --auto-local` with a dirty `logos-design-system` rebuilds the design system for Android and the change is visible on the device.
- [ ] `ws build logos-basecamp --target android` produces the APK path and prints it.
- [ ] `--device` works with two devices attached; the error path with zero devices names `adb devices`.
- [ ] `ws run --help` / `ws build --help` document `--target`; workspace `CLAUDE.md` gains the flag.
- [ ] Works from aarch64-darwin and from x86_64-linux (WSL; device reachable via `adb connect` over TCP or by copying the APK, whichever is documented).

## Blocked by

- 04
