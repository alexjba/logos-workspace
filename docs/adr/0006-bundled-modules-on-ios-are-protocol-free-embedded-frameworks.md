# Bundled modules on iOS are one embedded framework each, with no Qt and no logos-protocol inside; the app image supplies the protocol

The module artifact today fuses Qt plugin glue, the Qt-free impl, the Rust
core and a static logos-protocol (which needs QtCore), and every module exports
the same unprefixed C ABI, so on iOS neither "ship the plugin as a framework"
(a second Qt per module) nor "link every module statically" (symbol collisions,
forked loader, one dependency graph for all modules) is acceptable. We instead
add a builder output that stops at the impl plus Rust core, leaves the lp_*
symbols undefined, and is packaged as a signed framework embedded in the app;
the Native container dlopens it with RTLD_LOCAL and the symbols resolve upward
against the app's single logos-protocol. Per-image token stores become
per-identity stores via the existing `admitConsumer` / `TokenManager::forIdentity`
path. This is Status ADR 0007's intent (dlopen from embedded frameworks, lazy
loading, loader semantics kept) made consistent with Qt being static-only on iOS.

## Consequences

- The same protocol-free artifact is what the Wasm host is built from, so
  "module without protocol, host image supplies it" becomes the one mobile
  build shape.
- A linker spike gates it: upward resolution of undefined symbols from a
  dlopened framework into the executable on iOS (two-level namespace vs
  `-undefined dynamic_lookup`), with the static registration table as the
  documented fallback if it fails.
- UI apps ship the same way: an embedded framework holding the Qt backend and
  QML resources, resolving Qt upward into the app image (the executable
  exports Qt's symbols). Same spike, larger symbol set; a static archive linked
  at shell build is the fallback for UI apps only.
- Bundling a Store shell is therefore fetch-and-embed with no per-module
  codegen and no link step: the Native container uses one generic host glue
  that reads each module's contract at runtime via `logos_module_get_methods`.
- Android Bundled modules use the same artifact from `jniLibs`; Qt is shared
  there, so today's plugins would also work, but one shape is kept on purpose.
