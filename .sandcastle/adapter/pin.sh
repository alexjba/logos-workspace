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
  if grep -qE "^[[:space:]]*${repo}([[:space:]]*=|\.)" flake.nix; then
    nix flake update "$repo"
  fi
done
git add nix/dep-graph.nix flake.nix flake.lock
git status --short -- repos/ nix/dep-graph.nix flake.nix flake.lock
