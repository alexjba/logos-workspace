# Handoff: Logos mobile track → next session: core-stack architecture for mobile (iOS first)

Written 2026-09-09 from a two-day session in `/Users/alexjbanca/Repos/logos-workspace`.
Owner: Alex Jbanca (GitHub `alexjba`). Terse reporting preferred (see `~/.claude/CLAUDE.md`).

## Where the artifacts are (do not re-derive)

- Plan, decisions, glossary, ADRs, ticket drafts: workspace branch `docs/mobile-bring-up`
  (`docs/mobile-bring-up-plan.md`, `CONTEXT.md`, `docs/adr/0001-*.md`, `docs/adr/0002-*.md`,
  `docs/issues/README.md` + `01`–`12`). Not on master; not pushed anywhere.
- Status ADR the whole track reacts to: `/Users/alexjbanca/Repos/status-desktop/docs/adr/0007-in-process-logos-module-execution-on-mobile.md`.
- Nightly-bump diagnosis (12 root causes, ordered fix list): `/Users/alexjbanca/Repos/logos-workspace--bump-green/AGENT-NOTES.md`.
- Session memory: `~/.claude/projects/-Users-alexjbanca-Repos-logos-workspace/memory/` (`mobile-bring-up-track.md` has the timeline; `workspace-tracks-master.md`, `no-session-link-in-prs.md`, `user-nix-preferences.md` are standing rules).

## Open draft PRs (all reviewed, squashed, mergeable as of 2026-09-08 evening)

| PR | Head | Content |
|---|---|---|
| logos-co/logos-nix#7 | f28310d | Qt 6.11.1 from source for `aarch64-ios-simulator` + `aarch64-ios` (static frameworks), opt-in `lib.mobileTargets`, `mkIosCmakeStage`, Xcode version gate |
| logos-co/logos-nix#8 | f6755ed | Qt 6.11.1 for `aarch64-android` (shared libs), `pkgs.mkQtAndroidApk`; standalone, not stacked on #7 |
| fork branch `alexjba/logos-nix:feat/mobile-cross-toolchains` | 2348fa5 | merge of #7 + #8; what basecamp locks until both merge |
| logos-co/logos-basecamp#394 | 3f60c70 | Shell preview on the iOS simulator (+ scaffolding: fork input, `forAllMobileTargets`, design system built from source with the cross set) |
| logos-co/logos-basecamp#395 | 668d5c3 | Shell preview as an Android APK (stacked on #394) |
| logos-co/logos-basecamp#398 | 0b67982 | Shell preview on a physical iOS device (stacked on #395); verified on Alex's iPad Air, team 8B5X2M6H2Y |
| logos-co/logos-workspace#102 / #103 | 23e4e31 / e05c9f1 | `ws test` fix + basecamp bump. PARKED: Alex's policy is "all submodules at master head, fix until green"; these pin intermediate revs and should be reshaped or closed. logos-test-modules#58 (merged) fixed one of the failures. |

Merge order when the team gets to it: nix #7 and #8 (either order, small conflict for the second), then flip basecamp's `logos-nix` input back to `github:logos-co/logos-nix` (one lock commit on `feat/mobile-scaffolding`), then #394 → #395 → #398.

Rules Alex set: never put the claude.ai session URL in PR descriptions; PR descriptions stay short; no ADR numbers cited in repos that do not contain the ADR; squash each PR to one commit; no hello/test apps in toolchain repos except a minimal consumer check.

## Facts established that constrain the next session's question

1. **Qt on iOS is static-only.** `qt_auto_detect_apple()` in `qtbase/cmake/QtAutoDetectHelpers.cmake` hard-fails `BUILD_SHARED_LIBS=ON` for iOS/visionOS; no override. Qt's own iOS distribution is static frameworks. Verified against 6.9 and 6.11.1 sources.
2. **Consequence:** `QPluginLoader` cannot load a dynamic Qt plugin on iOS without a second copy of Qt in the plugin (duplicate QObject/metatype statics). The Shell preview therefore links `main_ui` statically on iOS (`MAIN_UI_STATIC` + `SHELL_PREVIEW_STATIC_SHELL`, `Q_IMPORT_PLUGIN`, `staticInstances()`); on Android it stays a `QPluginLoader`-loaded `.so`.
3. **ADR 0007's iOS plan is inconsistent with (1).** It says modules are dlopened from embedded signed `.framework`s with `RTLD_LOCAL`; modules are C++ Qt plugins, so each framework would carry its own Qt. Its own fallback (static link + registration table, `QPluginLoader::staticInstances()` enumeration) is what actually works today. Alex is NOT convinced static-only is the right end state and wants a middle ground explored.
4. **Middle-ground leads to investigate (not yet researched):**
   - Modules as **C-ABI cdylibs with no Qt inside**, host owning Qt. The tooling already exists: `logos-cpp-generator --backend cdylib` emits the C ABI, `logos-qt-host-generator --backend cdylib` hosts it in Qt, `logos-module-builder` does both for `interface: "universal" | "cdylib"` in `metadata.json` (seen in basecamp `mock/README.md` error text and module-builder 9592569's "requires `interface`" rule). A Qt-free cdylib is a legal embedded framework on iOS and dlopen-able. Question: how much of a real module (Rust core + protocol stack) is Qt-free, and what does the Qt-side host glue cost.
   - **`LogosMode::Local`** in-process transport in logos-protocol (`LogosModeConfig`, header-only inline per image, `MockStore`), designed for "mobile apps, single process"; test-only today, with a known event-delivery gap.
   - **Umbrella dynamic framework** re-exporting static Qt, linked by host and plugins alike (hack; no precedent found).
   - **Patching Qt's iOS shared-lib gate** and building Qt as dynamic frameworks from source (we build Qt from source anyway, so a one-line patch is feasible; unsupported by Qt; risk in `qt_add_executable` finalizers/plugin deployment). A time-boxed spike was suggested in the plan (`docs/issues/11`).
   - **wasm/webview container** for third-party modules (ADR 0007's designated home) is out of scope for first-party modules.
5. **Runtime/toolchain facts:** every module plugin exports the same unversioned C ABI symbols (`logos_module_dispatch`, …) so multiple plugins in one process need per-image symbol scoping; Qt for Android is built with `openssl_runtime` and nothing bundles libssl yet (blocker for any TLS-using module on Android); the Android DT_NEEDED gate cannot see `dlopen`; nixpkgs system third-party libs must be replaced by Qt's bundled copies in Android Qt.

## Repos to read for the architecture analysis (all under `repos/` in the workspace, some are shallow/https clones)

- `logos-liblogos`: `ModuleContainer` interface, `LoadedModuleHandle::pid = -1` in-proc sentinel, `LogosMode::Local`, `logos_host` per-module process model, capability token enforcement line.
- `logos-cpp-sdk`: LogosAPI, IPC layer (QtRemoteObjects/LocalSocket), `cpp-generator` (`--backend cdylib`, LIDL frontend `share/lidl-frontend`), `logos-lidl` (interface definition language; workspace does not register it as an input, see diagnosis root cause #1).
- `logos-qt-sdk` / `logos-plugin-qt` / `logos-qt-host` / `logos-module-loader-qt` / `logos-view-module-runtime` (`ui-host` subprocess that dlopens UI plugins; not iOS-viable).
- `logos-module-builder` (`mkLogosModule`, `mkLogosQmlModule`, `interface` kinds), `logos-rust-sdk` (typed records, `catch_unwind` posture), `logos-protocol`.
- `logos-basecamp` `app/interfaces/IShellHost.h`, `IShellView.h`, `shell-preview/`, `mock/README.md` ("One logos-protocol in every image" section explains per-image statics).
- Status side: `status-desktop/mobile/` (Makefile, `android/`, `ios/`), ADR 0007, and how status-go is embedded in-process on iOS today.

Note: `repos/logos-cpp-sdk`, `repos/logos-liblogos` etc. in the main workspace checkout may be empty or at July pins; the full, current trees are in `/Users/alexjbanca/Repos/logos-workspace--bump-green/repos/` (all submodules at 2026-09-08 master heads) and `/Users/alexjbanca/Repos/logos-workspace--bump-basecamp/repos/` (basecamp cd0d16b's follows set). Use those.

## Environment notes

- Machines: this Mac (aarch64-darwin, Xcode 26.6, Android SDK/NDK at `~/Library/Android/sdk`, Samsung SM-G990B and an arm64 emulator `Medium_Phone`; iPhone 15 Pro Max and iPad Air paired over the network, no USB) and `ssh evo-wsl` (x86_64-linux, Determinate Nix, strict sandbox, 47 GB after `.wslconfig` edit; `vmIdleTimeout=-1` set; basecamp clone at `~/Repos/logos-basecamp`, logos-nix fork at `~/Repos/logos-nix`; `claude` 2.1.263 installed; headless agents run via `setsid nohup claude -p … --dangerously-skip-permissions`). Windows host reachable as `ssh evo` (PowerShell).
- Permissions: `.claude/settings.local.json` allows `ssh evo-wsl *` and `scp * evo-wsl:*`; `.claude/settings.json` has read-only allowlist additions. The auto-mode classifier blocks writing permission files and sometimes `cmux` status commands.
- Worktrees in use: `~/Repos/agents/{logos-nix-ios,logos-nix-android,basecamp-mobile,basecamp-ios,basecamp-android,basecamp-ios-device}`, `~/Repos/logos-workspace--{bump-basecamp,ci102,bump-green}`. Git for submodules must use https (no GitHub SSH key in agent shells); per-repo `url.https://github.com/.insteadOf` is set in those worktrees.
- Known harness quirk: subagents that end a turn "waiting on a monitor" never wake; poll builds in the foreground or nudge them. `writeShellApplication`'s shellcheck gate is invisible to `nix flake check --no-build`; build runner packages explicitly.

## Suggested skills for the next session

- `grilling` with `domain-modeling` (`/grill-with-docs`): Alex plans by being interviewed one question at a time and expects the glossary/ADRs updated inline; start there for the iOS module-loading question.
- `research`: for primary-source checks (Qt iOS shared-lib gate, App Store 2.5.2 / embedded frameworks rules, dlopen of Qt-free dylibs on iOS, `Q_IMPORT_PLUGIN` limits).
- `logos-module-development`: for the module/SDK internals (metadata `interface` kinds, LogosAPI, generator backends).
- `superpowers:brainstorming` before any design write-up; `prototype` if a spike (e.g. a Qt-free cdylib module dlopened by a static-Qt host on the simulator) is the fastest way to answer.
- `wayfinder` only if the analysis turns into a multi-session investigation map.
