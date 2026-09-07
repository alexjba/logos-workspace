# 08 · `ws run --target ios-sim` and `--target ios-device`

## What to build

Extend the `--target` mechanism from slice 05 with the two iOS targets,
mapping to `aarch64-ios-simulator` and `aarch64-ios`, and pass `--device`
through to the repo's run app. No implicit fallback from device to simulator.
The device target becomes usable once slice 07 lands; the flag plumbing does
not have to wait for it.

## Acceptance criteria

- [ ] `ws run logos-basecamp --target ios-sim` launches the Shell preview on the simulator from the workspace root.
- [ ] `ws run logos-basecamp --target ios-device` launches on a connected iPhone when `LOGOS_IOS_TEAM_ID` is set, and fails early with the variable named when it is not.
- [ ] `--auto-local` with a dirty `logos-design-system` propagates to the iOS build.
- [ ] `ws build logos-basecamp --target ios-sim` prints the store path of the static-lib output.
- [ ] Help text and workspace `CLAUDE.md` list all three targets; running any `--target` on x86_64-linux for an iOS target fails with "iOS targets build on macOS only".

## Blocked by

- 05
- 06 (07 for the device target to be end-to-end)
