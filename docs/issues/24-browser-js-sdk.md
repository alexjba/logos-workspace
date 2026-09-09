# 24 · Browser JS SDK speaking the web transport

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 20.
Repos, landing order: logos-js-sdk (fork).

## What to build

A browser build of the JS SDK implementing the lp_* consumer and provider
semantics in JavaScript over a `MessagePort`-shaped channel, sharing the
message shapes with the Node SDK (which stays on koffi). It is what HTML/JS
modules use and what the Wasm host's glue will call. End-to-end test: a JS
provider and a JS consumer over a real `MessageChannel` in Node, and a JS
consumer against a C++ provider through a channel shim into the slice-23
transport.

## Acceptance criteria

- [ ] The e2e mirrors the Node SDK's: async call, object result, `{_bytes}` round trip, introspection, event, sync call.
- [ ] A browser-bundled consumer calls a C++ provider published on the web transport through a channel shim.
- [ ] Typed client generation from `.lidl` works for the browser build.
- [ ] Runs under `nix flake check`.

## Blocked by

- 23
