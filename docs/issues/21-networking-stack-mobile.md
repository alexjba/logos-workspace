# 21 · Chat, delivery and libp2p cross-built as Bare modules for iOS and Android

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 2, 48.
Repos, landing order: logos-nix (nim/Rust cross) -> logos-libp2p-module -> logos-delivery-module -> logos-chat-module.

## What to build

nim-libp2p's C bindings, logosdelivery with rln, and the chat Rust core
build for `aarch64-ios`, `aarch64-ios-simulator` and `aarch64-android` in nix
and emerge as Bare variants through the builder. TCP/QUIC transports stay;
openssl and any bundled third-party libraries are linked into the module
(Android's `openssl_runtime` gap closed). Verified in isolation on devices
through the slice-18 host before the Bundled-set build consumes them.

## Acceptance criteria

- [ ] All three modules produce `ios-arm64`, `ios-sim-arm64` and `android-arm64` Bare variants that pass the gate.
- [ ] On the iPad and the Samsung, the slice-18 host loads libp2p_module and it creates a node, dials a desktop peer, and exchanges a gossipsub message.
- [ ] delivery_module and chat_module load on both devices and `chat_module` can create a conversation backed by a desktop peer.
- [ ] Android DT_NEEDED gate passes (no unbundled system libs); TLS works on Android.

## Blocked by

- 13
- 15
