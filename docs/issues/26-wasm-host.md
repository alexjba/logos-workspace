# 26 · Wasm host: a Bare module and logos-protocol compiled to WebAssembly, running in a Worker

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 20, 21, 28, 29.
Repos, landing order: logos-nix (Emscripten pin) -> logos-protocol (wasm build) -> logos-module-builder (`web` output) -> logos-liblogos.

## What to build

Emscripten pinned in nix; logos-protocol builds for wasm32 with the web
transport as its only transport; the builder's `web` output compiles the Bare
module (Rust core via `wasm32-unknown-emscripten` on the same emsdk, or C++
impl) and links it with the wasm protocol into a Wasm host that runs in a Web
Worker, single-threaded, and speaks the web transport through the worker's
message port relayed by the page to the container. The counter's `web`
variant is the first artifact, called through `logoscore --container web`.

## Acceptance criteria

- [ ] `nix build .#web` on the counter produces a `web` LGX variant containing the Wasm host and its loader page.
- [ ] `logoscore --container web -l counter_web -c "counter_web.add(1,2)"` prints 3 on desktop CI.
- [ ] Per-image behaviour holds: the Wasm host has its own token store; two Wasm hosts in two webviews cannot see each other's tokens.
- [ ] A Rust panic inside the Wasm host surfaces as a module failure, not a page crash; the module restarts under the supervision policy.
- [ ] Wasm size and cold instantiate time are logged.

## Blocked by

- 15
- 25
