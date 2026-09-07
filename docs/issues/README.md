# Mobile bring-up issues (local drafts)

Tracer-bullet slices for `docs/mobile-bring-up-plan.md`. Not yet filed on GitHub.
Intended home: sub-issues of logos-co/logos-basecamp#89 (filling #119 Android,
#120 iOS) plus logos-nix issues for the toolchain slices.

| # | Slice | Repo | Blocked by |
|---|---|---|---|
| 01 | Bump basecamp to master in the workspace | logos-workspace | – |
| 02 | Hello-QML APK on an Android device from a nix derivation | logos-nix | – |
| 03 | Hello-QML app on the iOS simulator from nix-built static Qt | logos-nix | – |
| 04 | Shell preview APK on an Android device | logos-basecamp | 01, 02 |
| 05 | `ws run logos-basecamp --target android` | logos-workspace | 04 |
| 06 | Shell preview on the iOS simulator | logos-basecamp | 01, 03 |
| 07 | Shell preview on a physical iPhone | logos-nix, logos-basecamp | 06 |
| 08 | `ws run --target ios-sim / ios-device` | logos-workspace | 05, 06 |
| 09 | Android CI: APK on Linux, all ABIs cached | logos-nix, logos-basecamp | 04 |
| 10 | iOS CI: simulator app on macOS Jenkins, toolchains cached | logos-basecamp | 06 |
| 11 | MOBILE-HANDOFF.md, workspace docs, follow-up backlog | all | 05, 08 |

Build-platform matrix (verification is part of every toolchain slice):

| Target | Build platforms | Notes |
|---|---|---|
| Android (all ABIs) | aarch64-darwin (dev Mac), x86_64-linux (WSL: `ssh evo-wsl`, Determinate Nix 2.35, strict sandbox, 32 cores / 30 GB) | Windows is not a Logos build platform |
| iOS (device + simulator) | aarch64-darwin only | needs Xcode |
