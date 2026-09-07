# 07 · Shell preview on a physical iPhone

## What to build

The device half of iOS. In logos-nix, the `aarch64-ios` (`iphoneos`) package
set, same overlay and gate as the simulator set. In basecamp, the
`shell-preview-ios` derivation evaluated under it, and an
`apps.run-ios-device` entry that configures with automatic signing using a
team id from `LOGOS_IOS_TEAM_ID` (or a documented `ws` config entry), builds
with `xcodebuild`, and installs/launches with `xcrun devicectl` on the single
connected iPhone. Missing team id or no device must fail before the build
starts, with a message saying what to set.

## Acceptance criteria

- [ ] `nix build .#packages.aarch64-ios.qt6.qtbase` (and the module set) succeeds on aarch64-darwin, cached like the simulator set.
- [ ] `nix run .#run-ios-device` installs and launches the Shell preview on a physical iPhone with a developer-mode profile; fixture data visible.
- [ ] Without `LOGOS_IOS_TEAM_ID` the command exits non-zero before compiling and names the variable.
- [ ] With two devices connected, `--device <udid>` selects one; with none, the error names `xcrun devicectl list devices`.
- [ ] Screenshot from the device in the PR.

## Blocked by

- 06
