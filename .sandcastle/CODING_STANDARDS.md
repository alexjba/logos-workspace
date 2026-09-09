# Coding Standards — logos-workspace

Authoritative references: monorepo `CLAUDE.md` and `repos/logos-tutorial/logos-developer-guide.md`.

- C++17, Qt 6, CMake via Nix. A module's public API is its `Q_INVOKABLE` methods; keep `metadata.json` and `flake.nix` consistent with code changes.
- Never pin a separate nixpkgs; the workspace follows `logos-cpp-sdk/nixpkgs`.
- After adding tests to a repo's `flake.nix`, `ws sync-graph` must be run (pin.sh does this).
- Sub-repo changes must be tested with `--auto-local` and with at least one dependent.
- A change whose only verification is manual GUI interaction must be flagged in the review, not approved silently.

## Review verdicts

Approve only when: tests exist for new behaviour, the pin commit contains every touched gitlink, and no `flake.nix` URL points outside the `logos-fleet` org.
