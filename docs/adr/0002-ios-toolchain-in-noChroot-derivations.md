# iOS toolchain is built in `__noChroot` derivations gated on the Xcode version

Qt for iOS and every iOS compile need `xcrun`, Apple clang and the iPhoneOS SDK
from `/Applications/Xcode.app`, which cannot live in the store. We build Qt for
iOS from source (matching the from-source practice on every other target) in
derivations marked `__noChroot = true`, with an Xcode wrapper whose version is
part of the derivation inputs and which fails the build on mismatch. Outputs
are ordinary, cacheable store paths; the gate is what keeps a cache hit from a
different Xcode from being served as "the" result. Nothing iOS is bit-for-bit
reproducible, and machines with a strict sandbox must use `sandbox = relaxed`
(macOS default is `false`, which needs nothing).

## Considered options

- Hermetic build with the SDK copied into the store (nixpkgs `iphone64` shape):
  Apple's license forbids redistributing the SDK, Qt's toolchain still calls
  `xcrun`, and the nixpkgs path is unmaintained.
- Nix impure derivations: never cached, unusable for a multi-hour Qt build.
- Building Qt outside nix in a script: not nix-friendly, no caching semantics.
- Prebuilt Qt iOS archives as fixed-output fetches: the documented fallback if
  the from-source spike fails; moves all Xcode impurity into the `nix run` link
  step.
