---
title: Proposed amendment to Status ADR 0007 — the Bare module shape and the catalog-driven Bundled set
status: draft (this workspace only; not pushed to status-desktop)
date: 2026-09-12
amends: status-desktop `docs/adr/0007-in-process-logos-module-execution-on-mobile.md` (Accepted 2026-08-11)
decided-by: ADR 0006 (Bare modules), ADR 0007 (catalog and the Bundled set), ADR 0003/0004/0005 (the Web container)
issue: logos-workspace #20 (m1/31); PRD `docs/prd/store-shell-milestone-1.md`, user story 49
---

# Proposed amendment to Status ADR 0007

## Why this exists

Status ADR 0007 decided that on iOS and Android liblogos runs **inside the app's
UI process**: a new in-process container, modules `dlopen`ed with `RTLD_LOCAL`
from embedded signed frameworks on iOS and `jniLibs` `.so`s on Android, and
`LogosMode::Local` as the inter-module transport. **That decision stands and
this amendment does not reopen it.** Everything below is downstream of it.

Two of its supporting statements were written before the Logos side had built
the thing, and are now wrong in a way that matters to anyone building against
them — not in direction, but in the shape of the artifact and in where the
module set comes from. Both were settled upstream between 2026-08-11 and
2026-09-12, by ADR 0006 and ADR 0007 on the logos-workspace docs branch, and by
a spike that ran on the simulator and a signed iPad on 2026-09-09.

Written as two replacement passages plus the consequences that change, so it
can be applied to the ADR as an **Amendment** section without rewriting the
decision.

---

## Amendment 1 — a Bundled module carries no Qt and no protocol

### What ADR 0007 says today

> Module artifacts are C++ Qt plugins that statically link their Rust core plus
> the whole protocol stack, and every plugin exports the same unversioned C ABI
> symbols (`logos_module_dispatch`, …). Loading several into one process is only
> safe with per-image symbol scoping.

and, in the decision:

> `RTLD_LOCAL` / two-level namespaces keep each plugin's identical exported
> symbols and per-image singletons (TokenManager, Rust glue statics) private to
> that plugin.

### What it should say

> A Bundled module is a **Bare module**: the module implementation plus its Rust
> core, exporting the module-impl C ABI (`logos_module_dispatch`,
> `logos_module_get_methods`, …), with **no Qt and no logos-protocol inside it**
> and the logos-protocol consumer ABI (`lp_*`) left **undefined** for the app
> image to supply at load time. logos-module-builder produces it
> (`nix build .#bare`); a module author never chooses a shape and never reasons
> about symbol visibility or linking rules.
>
> On iOS it is packaged as one flat embedded signed framework per module
> (`<App>.app/Frameworks/<name>_bare.framework/`, Code Sign On Copy); on Android
> as `lib<name>_bare.so` in the app's native library directory. The Native
> container `dlopen`s it with `RTLD_LOCAL` and the `lp_*` symbols resolve
> **upward** against the app's **single** logos-protocol. A UI app's framework
> works the same way one level higher: it holds the Qt backend and the QML
> resources and binds Qt itself upward, so a module full of Qt carries none of
> it and the process has exactly one QtCore.
>
> `RTLD_LOCAL` still isolates each image's identical C ABI exports and its Rust
> glue statics. What it no longer has to isolate is the **runtime**: with one
> logos-protocol in the process there is one `TokenManager`, so per-image token
> stores become **per-identity** stores through the existing
> `admitConsumer` / `TokenManager::forIdentity` path.

### Why

Qt on iOS is **static-only**. "Ship the plugin as a Qt plugin, in a framework"
would put a second QtCore in every module; "link every module statically into
the app" collides on the unprefixed C ABI every module exports, forks loader
semantics and loses lazy loading. Neither is acceptable, and the choice between
them is what ADR 0007's passage was reasoning about. Removing Qt and the
protocol from the artifact removes the dilemma instead of resolving it: the
module is the only thing in the framework, and everything shared is shared
because there is one copy of it in the app.

This is ADR 0007's own intent — `dlopen` from embedded frameworks, lazy loading,
loader semantics kept — made consistent with Qt being static-only on iOS. It is
also what makes the Web container's artifact the *same* artifact: the `web`
variant is the same Bare module compiled to WebAssembly with the host linked in
beside it, so "module without protocol, host image supplies it" is one build
shape for both containers rather than two.

### Evidence

The spike passed on 2026-09-09 on the simulator and on a signed iPad Air, at all
three levels: `lp_*` resolving upward, Qt resolving upward with QML served from
the framework's own resources, and two frameworks with identical exported symbols
loaded under `RTLD_LOCAL` at once. Cost: the app exports only a listed symbol
set (`-exported_symbols_list`), **65 KB**, against 908 KB for exporting
everything; `dlopen` is 6–33 ms per image on device. The one precondition is on
the Qt build, not on the modules: the static iOS Qt must be built with
`-DFEATURE_reduce_exports=OFF` for both iOS targets, or the app has no Qt
symbols to export. Report: `docs/research/spikes/ios-dlopen-bare-module.md`.
The builder gates the artifact — a Qt or protocol symbol defined in a Bare
module fails the build rather than the device.

---

## Amendment 2 — the Bundled set is catalog-driven, from a list of app names

### What ADR 0007 says today

> The iOS module set is fixed at build time — Apple policy, not a packaging
> choice.

### What it should say

> The **Bundled set** — the native modules a store build carries — is fixed at
> build time, and it is assembled from the **same signed catalog the Web
> container installs from**, not from a vendored list of source repositories.
> The build takes a list of **app names** and a pinned catalog release, resolves
> the dependency closure, fetches each package by its Merkle root, verifies its
> Ed25519 signature against a DID the catalog declares, extracts the target
> variant, embeds it, and writes a Bundled-set manifest the Native container
> reads at start. No per-module code generation and no link step: the container
> uses one generic host glue that reads each module's contract at runtime
> through `logos_module_get_methods`.
>
> Two rules keep the set loadable, and the build enforces both at evaluation —
> naming the module and the path that reached it, not leaving it to a missing
> file or a blank screen:
>
> - a Bundled module may depend only on Bundled modules (core auto-loads
>   dependencies, and a build-time set cannot reach a runtime one);
> - a member that ships no variant for the target fails the build.
>
> Everything first-party that opens sockets — libp2p, delivery, the chat backend
> — is always in the Bundled set, because a webview has no raw TCP/UDP and
> proxying sockets to a plug-in is what App Store guideline 4.7.2 forbids.

### Why

"Fixed at build time" is correct and is policy. What does not follow from the
policy is *where the bytes come from*. Taking them from the catalog makes adding
an app to a shell **one name on a list** rather than a source integration, and
makes the build-time path and the runtime path one path with the same signature
and Merkle checks — the build is an installer that runs early. It also removes
the second list: the same catalog entry that tells a phone "this module has no
`web` variant, it is unavailable here" is what tells the shell build "this module
ships `ios-arm64`, embed it".

---

## Consequences of ADR 0007 that this changes

Three of ADR 0007's consequences were written against the old artifact and the
old module set. They should be amended with it:

| ADR 0007 says | Amended |
|---|---|
| "Capability tokens become **advisory** within one address space … Acceptable because v1 modules are first-party, bundled, and signed with the app." | Still **not an OS boundary** — that part is unchanged and remains the honest posture. What changes is that admission is now real and shared: with one protocol in the process, a Bundled module's consumer admission runs through `capability_module` and per-identity token stores, the same code path desktop uses, rather than a per-image store that only that image could see. "First-party, bundled and signed" remains the reason the residual risk is accepted. |
| "Full isolation has a **designated future home**: a wasm/webview container … Third-party or downloaded modules go there, never into the native in-process container." | Built, not future. The **Web container** is a container and `web` format loader on liblogos' existing factory seams, one webview per Downloaded module, the module's `web` variant running as a Wasm host in a Web Worker and its QML rendered by a bundled Qt-for-WebAssembly runtime. The rule it was written to state is unchanged and is now enforced by the packaging: a Downloaded module is a `web` variant and there is no artifact that would let one into the native container. |
| "Module artifacts are C++ Qt plugins that statically link … the whole protocol stack" (context) | See Amendment 1. Desktop is unaffected: a desktop module is still a Qt plugin in a `logos_host` subprocess, and nothing in this amendment changes the desktop model. |

What does **not** change: the decision itself (in-process on both platforms),
`LogosMode::Local` as the transport, `RTLD_LOCAL` loading from platform-native
locations, the hard-fault posture (a SIGSEGV in unsafe or C code kills the app,
the same posture as every native library Status already links), and the
lifecycle consequence that module work is frozen when the app is backgrounded.

## How this reaches status-desktop

Not by this repository. The text above is the **proposed** amendment; applying
it is a status-desktop change, made by whoever owns ADR 0007 there, and this
file exists so the two teams are building against the same description in the
meantime. The working rule for this milestone is that no upstream GitHub changes
are made and branches go to forks only.

## References

- Upstream decisions: `docs/adr/0006-bundled-modules-on-ios-are-protocol-free-embedded-frameworks.md`, `docs/adr/0007-catalog-variants-and-the-bundled-set-on-store-shells.md`, `docs/adr/0003-mobile-modules-bundled-native-or-downloaded-web.md`, `docs/adr/0004-web-container-ui-is-qml-on-a-bundled-qt-wasm-runtime.md`, `docs/adr/0005-web-container-is-a-transport-on-existing-seams.md`
- Spike: `docs/research/spikes/ios-dlopen-bare-module.md`
- Policy research: `docs/research/ios-runtime-qml-policy.md`
- PRD: `docs/prd/store-shell-milestone-1.md` (user stories 47–49)
- The artifact and the vocabulary, for a reader who wants to build one: the Logos developer guide, §1.5 (Bare and `web` outputs), §4.3 (the variant vocabulary), §6.2 (`--container`), §7.3 (the Bundled set).
