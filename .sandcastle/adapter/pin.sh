#!/bin/bash
# Stage a monorepo pin for the given sub-repos: gitlinks + regenerated flake inputs/lock.
# Usage: .sandcastle/adapter/pin.sh <repo...>   Then commit.
set -eu
source "$(dirname "$0")/env.sh"
[[ $# -gt 0 ]] || { echo "usage: pin.sh <repo...>" >&2; exit 1; }
for repo in "$@"; do
  [[ -d "repos/$repo" ]] || { echo "no such sub-repo: repos/$repo" >&2; exit 1; }
  git add "repos/$repo"
done
ws sync-graph --quiet
for repo in "$@"; do
  # logos-nix lives in the manual section of flake.nix (sync-graph skips it): move its rev to the gitlink.
  if [[ "$repo" == "logos-nix" ]]; then
    sha=$(git rev-parse ":repos/logos-nix")
    tmp=$(mktemp)
    sed -E "s|(logos-nix\.url = \"github:logos-fleet/logos-nix)(/[0-9a-f]+)?\"|\1/${sha}\"|" flake.nix > "$tmp"
    cat "$tmp" > flake.nix && rm -f "$tmp"
    grep -q "github:logos-fleet/logos-nix/${sha}\"" flake.nix || { echo "failed to pin logos-nix in flake.nix" >&2; exit 1; }
  fi
  if grep -qE "^[[:space:]]*${repo}([[:space:]]*=|\.)" flake.nix; then
    nix flake update "$repo"
  fi
done
git add nix/dep-graph.nix flake.nix flake.lock
git status --short -- repos/ nix/dep-graph.nix flake.nix flake.lock
