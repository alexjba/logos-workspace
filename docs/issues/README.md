# Mobile bring-up issues (local drafts)

Tracer-bullet slices for `docs/mobile-bring-up-plan.md`. Not yet filed on GitHub.
Intended home: sub-issues of logos-co/logos-basecamp#89 (filling #119 Android,
#120 iOS) plus logos-nix issues for the toolchain slices.

| # | Slice | Repo | Blocked by | Status |
|---|---|---|---|---|
| 01 | Bump basecamp to master in the workspace | logos-workspace | – | draft PRs logos-workspace#103, #102 (`ws test` fix + 3 pin moves), logos-test-modules#58 (qml-modules check) |
| 02 | Hello-QML APK on an Android device from a nix derivation | logos-nix | – | draft PR logos-nix#8, stacked on #7 |
| 03 | Hello-QML app on the iOS simulator from nix-built static Qt | logos-nix | – | draft PR logos-nix#7 |
| 04 | Shell preview APK on an Android device | logos-basecamp | 01, 02 | draft PR logos-basecamp#395 (stacked on #394) |
| 05 | `ws run logos-basecamp --target android` | logos-workspace | 04 | open |
| 06 | Shell preview on the iOS simulator | logos-basecamp | 01, 03 | draft PR logos-basecamp#394 |
| 07 | Shell preview on a physical iPhone | logos-nix, logos-basecamp | 06 | draft PR on logos-basecamp, stacked on #395 (verified on an iPad Air) |
| 08 | `ws run --target ios-sim / ios-device` | logos-workspace | 05, 06 | open |
| 09 | Android CI: APK on Linux, all ABIs cached | logos-nix, logos-basecamp | 04 | open |
| 10 | iOS CI: simulator app on macOS Jenkins, toolchains cached | logos-basecamp | 06 | open |
| 11 | MOBILE-HANDOFF.md, workspace docs, follow-up backlog | all | 05, 08 | open |
| 12 | Fold the basecamp Android workarounds into `mkQtAndroidApk` | logos-nix, logos-basecamp | 04 | open |

Build-platform matrix (verification is part of every toolchain slice):

| Target | Build platforms | Notes |
|---|---|---|
| Android (all ABIs) | aarch64-darwin (dev Mac), x86_64-linux (WSL: `ssh evo-wsl`, Determinate Nix 2.35, strict sandbox, 32 cores / 30 GB) | Windows is not a Logos build platform |
| iOS (device + simulator) | aarch64-darwin only | needs Xcode |

## Milestone 1 · Bundled and Downloaded modules on iOS and Android (2026-09-09)

Tracer-bullet slices for `docs/prd/store-shell-milestone-1.md`. Filed on the fork alexjba/logos-workspace (tracking issue #1). Branches go to `alexjba` forks only, named `m1/<nn>-<slug>`.

| # | Slice | Repos, landing order | Blocked by | PR / status |
|---|---|---|---|---|
| 13 | logos-nix iOS Qt exports the symbols Bare modules resolve upward | logos-nix (fork) | – | [#2](https://github.com/alexjba/logos-workspace/issues/2) |
| 14 | One variant vocabulary for mobile and web across lgx, lgpm, lgpd | logos-package -> logos-package-manager -> logos-package-downloader | – | [#3](https://github.com/alexjba/logos-workspace/issues/3) |
| 15 | Builder produces the Bare module artifact and a gate proves it protocol-free | logos-module-builder (fork); logos-test-modules for the counter | – | [#4](https://github.com/alexjba/logos-workspace/issues/4) |
| 16 | Native container in liblogos, driven by `logoscore --container inproc` | logos-protocol (Local mode fixes) -> logos-plugin-qt (generic glue) -> logos-liblogos -> logos-logoscore-cli | 15 | [#5](https://github.com/alexjba/logos-workspace/issues/5) |
| 17 | Two Bare modules in one process: capability tokens, cross-module calls, events | logos-capability-module (bare output) -> logos-test-modules -> logos-liblogos | 16 | [#6](https://github.com/alexjba/logos-workspace/issues/6) |
| 18 | Bare module as an iOS embedded framework and an Android shared object, loaded on devices | logos-nix (13) -> logos-module-builder -> logos-basecamp (host) | 13, 15, 16 | [#7](https://github.com/alexjba/logos-workspace/issues/7) |
| 19 | A `ui_qml` app's iOS variant as a framework, loaded into the app's QML engine | logos-module-builder -> logos-plugin-qt (view plugin base) -> logos-basecamp | 18 | [#8](https://github.com/alexjba/logos-workspace/issues/8) |
| 20 | Catalog-driven Bundled-set build: `ws build logos-basecamp --target <variant> --bundle <apps>` | logos-package (14) -> nix-bundle-logos-module-install -> logos-basecamp -> logos-workspace (`ws`) | 14, 18, 19 | [#9](https://github.com/alexjba/logos-workspace/issues/9) |
| 21 | Chat, delivery and libp2p cross-built as Bare modules for iOS and Android | logos-nix (nim/Rust cross) -> logos-libp2p-module -> logos-delivery-module -> logos-chat-module | 13, 15 | [#10](https://github.com/alexjba/logos-workspace/issues/10) |
| 22 | Milestone: messaging on a phone from a catalog-assembled Bundled set | logos-basecamp -> logos-workspace | 20, 21 | [#11](https://github.com/alexjba/logos-workspace/issues/11) |
| 23 | The web transport: plain protocol messages over a message channel | logos-protocol (fork) | – | [#12](https://github.com/alexjba/logos-workspace/issues/12) |
| 24 | Browser JS SDK speaking the web transport | logos-js-sdk (fork) | 23 | [#13](https://github.com/alexjba/logos-workspace/issues/13) |
| 25 | Web container and `web` format loader on desktop, driven by `logoscore --container web` | logos-liblogos -> logos-module-loader (web loader package) -> logos-logoscore-cli | 23, 24 | [#14](https://github.com/alexjba/logos-workspace/issues/14) |
| 26 | Wasm host: a Bare module and logos-protocol compiled to WebAssembly, running in a Worker | logos-nix (Emscripten pin) -> logos-protocol (wasm build) -> logos-module-builder (`web` output) -> logos-liblogos | 15, 25 | [#15](https://github.com/alexjba/logos-workspace/issues/15) |
| 27 | Qt-wasm QML runtime in nix and a `ui_qml` app's `web` variant rendered in the Web container | logos-nix (Qt wasm from source) -> logos-design-system -> logos-view-module-runtime (MessagePort QtRO) -> logos-module-builder -> logos-liblogos | 26 | [#16](https://github.com/alexjba/logos-workspace/issues/16) |
| 28 | Web container on iOS and Android with the live-runtime budget | logos-basecamp (mobile host) | 20, 27 | [#17](https://github.com/alexjba/logos-workspace/issues/17) |
| 29 | Catalog install on a Store shell: availability, consent, trust, report, index | logos-package-downloader-module -> logos-package-manager-module -> logos-capability-module -> logos-basecamp | 28 | [#18](https://github.com/alexjba/logos-workspace/issues/18) |
| 30 | First real `web` variants: keystore and wallet UI with a storage abstraction | logos-rust-sdk (storage trait) -> logos-evm-keystore-module -> logos-evm-wallet-ui | 27, 29 | [#19](https://github.com/alexjba/logos-workspace/issues/19) |
| 32 | liblogos core cross-built for iOS and Android and running on devices | logos-nix -> logos-protocol -> logos-plugin-qt -> logos-liblogos -> logos-basecamp | – | [#21](https://github.com/alexjba/logos-workspace/issues/21) |
| 31 | CI for both containers, developer docs, Status ADR 0007 amendment | logos-workspace (`ws test`) -> logos-tutorial -> status-desktop (text only) | 16, 25 | [#20](https://github.com/alexjba/logos-workspace/issues/20) |

Start now, in parallel: 13, 14, 15, 23, 32. First integration points: 16 (native), 25 (web).

### PR header (paste at the top of every PR body)

```
Slice: m1/<nn> — <title>            (docs/issues/<nn>-<slug>.md on docs/mobile-bring-up)
Lands after: <PR links this stacks on, or "nothing">
Workspace branch: <workspace branch whose lock includes this PR's commit>
Seam: <which test seam from the PRD this is verified at>
Verify: <one command from the acceptance criteria, with its expected output>
```

Architecture context is one link (the synthesis page or `docs/mobile-core-architecture.md`), never restated per PR. No ADR numbers in repos that do not contain the ADR.

### Landing order across repos

Pins move forward only in dependency order; `ws update-order <repo> --commands` prints it for any change. For milestone 1 the usual path is:
logos-package → logos-protocol → logos-plugin-qt → logos-liblogos → logos-module-builder / logos-module-loader → logos-nix → modules → logos-basecamp → logos-workspace pin bump.
Update the PR column above in the same commit that moves a pin.
