# 31 · CI for both containers, developer docs, Status ADR 0007 amendment

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 44, 49.
Repos, landing order: logos-workspace (`ws test`) -> logos-tutorial -> status-desktop (text only).

## What to build

`ws test` runs the inproc and web container suites on Linux and macOS
through `logoscore`; `ws sync-graph` picks up the new checks. The developer
guide and tutorials document Bare and `web` outputs, `--container`, the
variant vocabulary, the Bundled-set build and the storage abstraction. A
proposed amendment to Status ADR 0007 records that frameworks carry no Qt and
no protocol and that the Bundled set is catalog-driven.

## Acceptance criteria

- [ ] `ws test --all --type cpp` includes the container suites and is green on both platforms.
- [ ] Developer guide sections updated per the tutorial sync rule; commands in them copy-paste correctly.
- [ ] Amendment text for Status ADR 0007 drafted in this workspace's docs (not pushed to status-desktop).

## Blocked by

- 16
- 25
