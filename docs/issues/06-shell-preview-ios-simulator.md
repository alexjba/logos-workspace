# 06 · Shell preview on the iOS simulator

## What to build

The Shell preview on iOS, simulator first. Under the `aarch64-ios-simulator`
package set: logos-design-system and `main_ui` as static archives; the Shell
host imports the Shell statically on iOS (`Q_IMPORT_PLUGIN` and
`staticInstances()`, ADR 0001) instead of `QPluginLoader`, keeping the
`IShellView` contract and the ABI check unchanged; iOS packaging metadata
(Info.plist template, bundle id, icon). A `shell-preview-ios` derivation
builds everything up to static libraries with Ninja (`__noChroot`, ADR 0002)
and stages what the Xcode step needs. An `apps.run-ios-sim` entry does the
impure half: Xcode-generator configure against the store artifacts,
`xcodebuild` without signing, `simctl` boot/install/launch.

The static QML module archives of the Shell must be linked whole-archive, as
the desktop plugin already does; a silently dropped one is a blank pane, not
an error.

## Acceptance criteria

- [ ] `nix build .#packages.aarch64-ios-simulator.shell-preview-ios` succeeds on aarch64-darwin; output holds static archives and no dynamic library.
- [ ] `nix run .#run-ios-sim` launches the Shell preview on a booted arm64 simulator; sidebar, App Manager and Settings render with fixture data.
- [ ] The Shell's `hostAbiVersion()` check still runs and passes through the static-instance path.
- [ ] No Logos symbol in the final binary (`nm` check, same as the desktop preview documents).
- [ ] Changing the installed Xcode version is caught by the gate from slice 03 before any compile.
- [ ] Screenshot from the simulator in the PR.

## Blocked by

- 01
- 03
