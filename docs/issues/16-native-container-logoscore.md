# 16 · Native container in liblogos, driven by `logoscore --container inproc`

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 24, 44, 47.
Repos, landing order: logos-protocol (Local mode fixes) -> logos-plugin-qt (generic glue) -> logos-liblogos -> logos-logoscore-cli.

## What to build

An in-process `ModuleContainer` and loader registered through the existing
factory seams: it dlopens a Bare module with RTLD_LOCAL, resolves `lp_*`
against the host's logos-protocol, drives it through one generic host glue
(dispatch by name with JSON, contract read at runtime via
`logos_module_get_methods`, events via the emit callback), gives it a
per-identity token store via `admitConsumer`, and runs it on a supervised
thread with the documented in-process pid sentinel. `LogosMode::Local` is
hardened for production: event delivery to a subscriber whose provider
registers later, a real entry point, no test-only paths. `logoscore` gains
`--container inproc|subprocess`. Verified on macOS and Linux; nothing
mobile-specific yet.

## Acceptance criteria

- [ ] `logoscore --container inproc -m <dir> -l counter -c "counter.add(1,2)"` prints 3 on macOS and Linux CI.
- [ ] Events emitted by the module reach a `logoscore` subscriber; a subscription made before the provider is up is delivered once it is.
- [ ] Unload takes the module down without leaking the image (reload works); a module that fails to dlopen reports a load error, not a crash.
- [ ] `logos_core_get_modules_info` reports the module with `pid` -1 and correct `loaded` state; stats return an entry per running module.
- [ ] Existing subprocess path and all liblogos tests unchanged and green.

## Blocked by

- 15 (Bare module to load)
