# 14 · One variant vocabulary for mobile and web across lgx, lgpm, lgpd

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 26, 27, 50.
Repos, landing order: logos-package -> logos-package-manager -> logos-package-downloader.

## What to build

The single platform-variant table in logos-package learns `android-arm64`,
`android-x86_64`, `ios-arm64`, `ios-sim-arm64` and `web`, with host detection
and the ordered fallback list for each. lgpm and lgpd consume it unchanged in
shape. `lgx add --variant ios-arm64 --files <framework dir>` and `--variant
web --files <dist> --main <entry>` produce packages whose manifests verify.

## Acceptance criteria

- [ ] `lgx verify` accepts a package carrying every new variant; unknown spellings are rejected with the canonical name suggested.
- [ ] `lgpm` on a host reporting `ios-arm64` selects that variant, falls back per the documented order, and refuses a package with none of them with a variant-mismatch error naming the variants present.
- [ ] `lgpd list --json` shows per-package variants.
- [ ] Existing desktop variants and the `-dev` flavour are unaffected (tests unchanged and green).

## Blocked by

None - can start immediately
