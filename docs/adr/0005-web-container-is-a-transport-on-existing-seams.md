# The Web container is a fourth transport plus a container and format loader on liblogos' existing seams; the bridge is a transparent relay and auth stays end to end

Rather than a separate "web module" runtime with its own API and auth gate,
the Web container reuses what the stack already is: a "web" entry in the
transport enum that carries the plain transport's message types (Call, Result,
Subscribe, Event, Token, Methods) as JSON over the webview's postMessage
channel; a container that owns one webview per Downloaded module; and a "web"
format loader that maps an LGX `web` variant onto that container and sets the
module's transport set to `[{web}]`, both registered through the `makeContainer`
/ `makeFormatLoader` seams. The Wasm host links logos-protocol compiled to
WebAssembly and is an ordinary provider/consumer image. The native side of the
bridge only relays frames and attributes each one to its webview; tokens are
minted by capability_module and validated by the module's own ModuleProxy
(transport tag "web") exactly as over TCP, and the per-module consent that App
Store guideline 4.7.3 requires is a policy hook in capability_module's existing
`requestModule` path, not a second auth model at the bridge.

## Consequences

- Spike 2026-09-09 (`docs/research/spikes/liblogos-mobile-web-roundtrip.md`):
  liblogos_core and its whole link set build from source as static archives
  for iOS and shared for Android with nine small CMake option patches and no
  C++ change; the core starts in about 1 ms on device; a WKWebView page
  called a native module through the core and back in under 1 ms, subscribed
  to its events, and served a method as a provider, on the simulator and a
  signed iPad. Two facts shape the bridge implementation: WKScriptMessageHandler
  traps inside JavaScriptCore under Qt's separate-main-stack iOS entry, so the
  iOS channel is a custom URL scheme handler (page-to-native requests as
  fetches, native-to-page as a long-poll or event stream) rather than
  script messages; and `LogosModeConfig` is per image, so a host that links
  the protocol as a shared library on Android must call `lp_set_mode` through
  the C ABI rather than the inline C++ setter.

- Every existing SDK (C++, Rust, JS) gains Web modules without an API change;
  a browser JS SDK is the same message shapes without the length framing.
- A Web module's core-side identity is structural (which webview sent the
  frame), so token theft inside one module cannot impersonate another.
- Web-platform capabilities a module already has inside its webview (fetch,
  WebSocket, IndexedDB/OPFS, WebCrypto) are used directly and never proxied
  through the bridge; raw TCP and libp2p do not exist in Web variants.
