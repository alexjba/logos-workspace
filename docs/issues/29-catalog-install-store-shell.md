# 29 · Catalog install on a Store shell: availability, consent, trust, report, index

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 4, 5, 7, 9, 14, 15, 46, 51, 53.
Repos, landing order: logos-package-downloader-module -> logos-package-manager-module -> logos-capability-module -> logos-basecamp.

## What to build

The App Manager on the phone browses the catalog through the existing
package-downloader and package-manager modules, shows per-variant
availability ("available on desktop, not in this build" for native-only
packages), installs a `web` variant into the Web container, and shows the
signer-trust prompt before install. capability_module gains a policy hook on
`requestModule` that asks the Shell for per-module consent when either party
is a Downloaded module, remembered per pair. Each catalog entry exposes a
report link and the catalog publishes an index with a universal link per
module.

## Acceptance criteria

- [ ] On the iPad, installing the counter UI from a local catalog release results in a running Downloaded module in the Shell's workspace without an app update.
- [ ] A native-only package is listed as unavailable with the reason; its install control is absent.
- [ ] The first call from the Downloaded module to chat_module prompts for consent; denial fails the call with a clear error; grant persists across restarts.
- [ ] The signer prompt shows the package's signer name and DID before install; an unsigned or mismatched package cannot be installed.
- [ ] The catalog index JSON contains a universal link and a report link per module; the Shell opens both.

## Blocked by

- 28
