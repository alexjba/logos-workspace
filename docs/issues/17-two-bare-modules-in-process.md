# 17 · Two Bare modules in one process: capability tokens, cross-module calls, events

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 6, 28.
Repos, landing order: logos-capability-module (bare output) -> logos-test-modules -> logos-liblogos.

## What to build

capability_module, the counter and a relay module (from the test-modules
ipc group) all run as Bare modules in the Native container. The relay calls
the counter through its generated typed client; the first call triggers
`requestModule`, capability mints the pair token, pushes it to the counter's
handshake object, and the call succeeds; a second identity cannot present the
first one's token. Host-services grant crosses into capability_module's image
as it does over argv today.

## Acceptance criteria

- [ ] `TEST_GROUPS=ipc` for logos-test-modules passes under `--container inproc`.
- [ ] A relay call before any token exists succeeds after exactly one `requestModule`; the log shows no re-exchange loops.
- [ ] A module isolated as identity A cannot call B with a token issued to C (rejected, constant-time path).
- [ ] capability_module's restriction policy still denies a disallowed caller in-process.
- [ ] Two modules exporting identical C ABI symbols coexist; each handle reaches its own image.

## Blocked by

- 16
