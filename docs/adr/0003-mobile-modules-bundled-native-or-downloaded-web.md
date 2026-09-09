# On store-distributed mobile apps a module is either Bundled native or Downloaded into the Web container; desktop and sideloaded Android keep native Downloaded modules

iOS executes only code signed into the app bundle, and DPLA 3.3.1(B) forbids
downloading executable code, so a native module on iOS can only be a Bundled
module fixed at build time. Runtime installation from the catalog is legal on
iOS solely through App Store guideline 4.7 (plug-ins not embedded in the binary,
run by WebKit), so a Downloaded module on iOS runs in the Web container from the
package's `web` LGX variant. Google Play's Device and Network Abuse policy
forbids downloading `.so` files from outside Play with the same webview/
interpreter exception, so a Play-distributed Android app is under the same
rule. The Web container exists on every platform; desktop, and Android builds
distributed outside Play, additionally keep loading native Downloaded modules.
A module without a `web` variant is not listed on a store-distributed mobile
app at all rather than installing and failing. See `docs/research/ios-runtime-qml-policy.md`.

## Consequences

- One catalog, per-platform variants: authors who want iOS reach ship a `web`
  variant, which also runs unchanged on desktop and Android, so one dev loop
  covers every platform; the host-services contract that variant needs (network, storage,
  keys via Logos APIs, never raw platform APIs) is what guideline 4.7.2
  requires anyway.
- 4.7.3 and 4.7.4 become product requirements: per-module user consent before
  a capability grant, and a published module index with universal links.
- Downloaded QML executed by the native Qt engine is permitted only in dogfood
  builds that never go through App Review; the product never relies on it.
- A Remote core (phone as a client of the user's desktop) is a dogfood posture
  for the mobile track, not the product architecture: the phone runs a local
  core with the Native container for Bundled modules and the Web container for
  Downloaded ones.

- One webview per Downloaded module (its own WebContent process), so
  isolation, crash blast radius and message attribution are per module as on
  desktop; the host owns a live-module budget and evicts background modules.

## Considered options

- wasm/Web container as the Downloaded format on every platform: one artifact
  and one behaviour, but it would remove every existing native catalog module
  from desktop, where the product is real today. Kept as the direction once the
  host-services contract is proven.
- Patching Qt's iOS shared-library gate to dlopen native modules: irrelevant to
  Downloaded modules (the platform refuses unsigned code regardless); at most a
  packaging convenience for Bundled ones.
