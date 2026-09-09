# 30 · First real `web` variants: keystore and wallet UI with a storage abstraction

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 10, 11, 22, 23.
Repos, landing order: logos-rust-sdk (storage trait) -> logos-evm-keystore-module -> logos-evm-wallet-ui.

## What to build

A storage abstraction in the Rust SDK backed by the filesystem natively and
by OPFS/IndexedDB in the Wasm host, adopted by the keystore's file writes. The
keystore and the wallet UI ship `web` variants from the same sources; the
wallet UI's backend runs in the Wasm host and talks to eth_rpc (Bundled) over
the bridge. Installed from the catalog on a Store shell per slice 29.

## Acceptance criteria

- [ ] Keystore `web` variant creates, encrypts and reloads a key across page reloads on desktop Web container and on the iPad.
- [ ] Wallet UI `web` variant renders balances fetched through the Bundled eth_rpc module on the phone.
- [ ] Native builds of both modules are unchanged in behaviour (existing tests green).
- [ ] The storage abstraction's contract is documented in the developer guide.

## Blocked by

- 27
- 29 (device)
