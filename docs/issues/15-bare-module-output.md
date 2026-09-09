# 15 · Builder produces the Bare module artifact and a gate proves it protocol-free

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 19, 45.
Repos, landing order: logos-module-builder (fork); logos-test-modules for the counter.

## What to build

logos-module-builder gains a `bare` output next to the plugin: the module
impl plus Rust core linked with `lp_*` symbols left undefined and no Qt, no
generated Qt glue, no logos-protocol archive. Desktop targets first (`.dylib`
/ `.so`). A gate in the build (nm/otool-based, modelled on the Android
DT_NEEDED gate in logos-nix) fails the derivation if the artifact references
any Qt or `logos_protocol` symbol or misses a module-impl ABI export. The
counter test module is the first consumer.

## Acceptance criteria

- [ ] `nix build .#bare` on the counter module yields an artifact exporting `logos_module_dispatch`, `logos_module_get_methods`, `logos_module_get_protocol_version`, `logos_module_string_free` and the rest of the module-impl ABI, with `lp_*` undefined.
- [ ] The gate fails a deliberately Qt-linked build with a message naming the offending symbol.
- [ ] Rust-core modules (a `codegen.rust` module) and C++ `universal` modules both produce the output.
- [ ] Existing plugin outputs and every downstream check stay green.

## Blocked by

None - can start immediately
