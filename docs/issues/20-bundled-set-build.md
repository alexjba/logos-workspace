# 20 · Catalog-driven Bundled-set build: `ws build logos-basecamp --target <variant> --bundle <apps>`

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 37, 38, 39, 40.
Repos, landing order: logos-package (14) -> nix-bundle-logos-module-install -> logos-basecamp -> logos-workspace (`ws`).

## What to build

A nix function in basecamp takes a target variant, an app-name list and a
pinned catalog release (a local catalog directory for tests): resolves the
dependency closure from package manifests, fetches each `.lgx` as a
fixed-output derivation keyed by its Merkle root, verifies the Ed25519
signature, extracts the target variant, embeds frameworks / `.so`s, and writes
a Bundled-set manifest into the app. The mobile host implements `ICoreRuntime`
from that manifest (known, loaded, load, unload, refresh, stats) and the
Shell's Modules tab lists the set. `ws build` and `ws run --target` grow the
`--bundle` flag. Builds fail loudly when a closure member lacks the variant.

## Acceptance criteria

- [ ] `ws build logos-basecamp --target ios-sim-arm64 --bundle counter_ui` produces an app whose Frameworks directory and manifest match the resolved closure (counter_ui, counter, capability_module).
- [ ] Requesting an app whose dependency has no `ios-sim-arm64` variant fails at evaluation naming the module and the variants it does ship.
- [ ] A tampered `.lgx` (signature or hash mismatch) fails the fetch step.
- [ ] On the simulator the Shell's Modules tab lists exactly the bundled modules; load/unload from the Shell works through the Native container.
- [ ] No per-module code generation runs in the shell build; adding an app to `--bundle` changes no source file.

## Blocked by

- 14
- 18
- 19
