# 13 · logos-nix iOS Qt exports the symbols Bare modules resolve upward

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 42.
Repos, landing order: logos-nix (fork).

## What to build

Both iOS Qt derivations (`aarch64-ios`, `aarch64-ios-simulator`) build with
`reduce_exports` off so the app image can export QtCore/QtGui/QtQml symbols to
dlopened frameworks, and the iOS CMake stage gains a way to pass an
exported-symbols list and `-u` forced references to an app target. The dlopen
spike (`docs/research/spikes/ios-dlopen-bare-module.md`) is re-run against the
rebuilt Qt with no visibility patch.

## Acceptance criteria

- [ ] Both iOS Qt packages rebuild with the flag; drvPath change is the only diff to consumers.
- [ ] The spike's Level 2 (Qt-backend framework, QML from qrc) passes on the simulator and the iPad with the visibility patch deleted.
- [ ] Executable growth with an exported-symbols list stays in the tens of KB (spike: 65 KB); exporting everything is not the default.
- [ ] Shell preview on iOS still builds and runs unchanged.

## Blocked by

None - can start immediately
