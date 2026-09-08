# Mobile bring-up issues (local drafts)

Tracer-bullet slices for `docs/mobile-bring-up-plan.md`. Not yet filed on GitHub.
Intended home: sub-issues of logos-co/logos-basecamp#89 (filling #119 Android,
#120 iOS) plus logos-nix issues for the toolchain slices.

| # | Slice | Repo | Blocked by | Status |
|---|---|---|---|---|
| 01 | Bump basecamp to master in the workspace | logos-workspace | – | draft PRs logos-workspace#103, #102 (`ws test` fix + 3 pin moves), logos-test-modules#58 (qml-modules check) |
| 02 | Hello-QML APK on an Android device from a nix derivation | logos-nix | – | draft PR logos-nix#8, stacked on #7 |
| 03 | Hello-QML app on the iOS simulator from nix-built static Qt | logos-nix | – | draft PR logos-nix#7 |
| 04 | Shell preview APK on an Android device | logos-basecamp | 01, 02 | open |
| 05 | `ws run logos-basecamp --target android` | logos-workspace | 04 | open |
| 06 | Shell preview on the iOS simulator | logos-basecamp | 01, 03 | open |
| 07 | Shell preview on a physical iPhone | logos-nix, logos-basecamp | 06 | open |
| 08 | `ws run --target ios-sim / ios-device` | logos-workspace | 05, 06 | open |
| 09 | Android CI: APK on Linux, all ABIs cached | logos-nix, logos-basecamp | 04 | open |
| 10 | iOS CI: simulator app on macOS Jenkins, toolchains cached | logos-basecamp | 06 | open |
| 11 | MOBILE-HANDOFF.md, workspace docs, follow-up backlog | all | 05, 08 | open |

Build-platform matrix (verification is part of every toolchain slice):

| Target | Build platforms | Notes |
|---|---|---|
| Android (all ABIs) | aarch64-darwin (dev Mac), x86_64-linux (WSL: `ssh evo-wsl`, Determinate Nix 2.35, strict sandbox, 32 cores / 30 GB) | Windows is not a Logos build platform |
| iOS (device + simulator) | aarch64-darwin only | needs Xcode |
