# 10 · iOS CI: simulator app built on the macOS Jenkins agent, toolchains cached

## What to build

Basecamp's macOS builds live in `ci/macos.Jenkinsfile` (GitHub Actions has no
macOS job). Add a stage that builds `shell-preview-ios` for the simulator,
runs the Xcode link step, archives the resulting `.app`, and pushes the nix
closure (both iOS Qt sets) to the Logos cache. The agent's Xcode version must
match the gate; the stage fails loudly if it doesn't, and the required
version is stated in the Jenkinsfile.

## Acceptance criteria

- [ ] Jenkins master build of basecamp produces `LogosBasecampShellPreview.app` (simulator) as an archived artifact.
- [ ] The macOS agent has `sandbox = false` or `relaxed`; the stage documents which and why (ADR 0002).
- [ ] After a master build, a dev Mac with the cache configured fetches `packages.aarch64-ios-simulator.qt6.*` and `aarch64-ios.qt6.*` instead of building; verified once and recorded.
- [ ] An Xcode mismatch on the agent fails at the gate with both versions in the log.

## Blocked by

- 06
