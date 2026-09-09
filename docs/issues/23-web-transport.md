# 23 · The web transport: plain protocol messages over a message channel

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 52.
Repos, landing order: logos-protocol (fork).

## What to build

A fourth `LogosProtocol` value, `Web`, with a transport host and connection
that carry the plain transport's message types (Call, Result, Subscribe,
Unsubscribe, Event, Token, Methods, MethodsResult) as JSON over an abstract
message channel (no byte framing). The channel is injected: tests use an
in-memory pair; hosts later bind it to a webview's postMessage. `ModuleProxy`
receives the transport tag "web". The transport factory resolves `Web` in
Remote mode; `needsQtEventLoop` answers correctly for it.

## Acceptance criteria

- [ ] A provider published on the web transport answers calls, methods, subscribe/unsubscribe and events through an in-memory channel pair, mirroring the plain TCP transport tests.
- [ ] Token messages flow and `ModuleProxy` validates with tag "web"; a transport-sensitive validator can distinguish web from local.
- [ ] Frames larger than the plain transport's max are rejected identically.
- [ ] logos-protocol version bump follows the semver rule (additive minor).

## Blocked by

None - can start immediately
