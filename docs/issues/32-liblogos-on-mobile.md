# 32 · liblogos core cross-built for iOS and Android and running on devices

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 41, 42, 47.
Repos, landing order: logos-nix (cross deps: Boost, OpenSSL, spdlog, nlohmann) -> logos-protocol -> logos-plugin-qt -> logos-liblogos -> logos-basecamp (smoke host).

## What to build

liblogos_core and everything it links (logos-protocol with the qt_remote, qt_local
and plain transports, logos-plugin-qt, the loader registry) build as static
libraries under the `aarch64-ios`, `aarch64-ios-simulator` and `aarch64-android`
package sets in nix, on the existing mobile toolchains. The subprocess container
and `logos_host` compile but are never selected on iOS; the Android build keeps
them. A minimal smoke host (a shell-preview-style app from the nix static-Qt
pipeline) calls `logos_core_init` / `logos_core_start` against an empty modules
directory and a persistence path inside the app sandbox, then prints
`logos_core_get_modules_info` and the protocol version. This is the first moment
Logos runtime code executes on a phone; no module is loaded yet.

## Acceptance criteria

- [ ] `nix build` of liblogos_core succeeds for all three mobile package sets from aarch64-darwin (and Android from x86_64-linux); the derivations pull no host-only dependency.
- [ ] The smoke host launches on the iPhone simulator, the iPad Air (signed) and the Samsung device, starts the core, and logs the modules listing and protocol version; the process stays alive and exits cleanly on request.
- [ ] Core start-up time is logged on both devices.
- [ ] Nothing in the build path references `/nix/store` at runtime on device (checked as for the Shell preview).

## Blocked by

None - can start immediately (independent of slice 16; the Native container plugs in later)
