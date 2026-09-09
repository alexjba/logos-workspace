#!/bin/bash
# Runs once per sandbox (onSandboxReady), from the monorepo root.
set -eu
if [[ ! -x /nix/var/nix/profiles/default/bin/nix ]]; then
  echo "bootstrap: installing single-user Nix into /nix"
  sh /opt/nix-install.sh --no-daemon --yes
fi
source "$(dirname "$0")/env.sh"
gh auth setup-git
git config --global url."https://github.com/".insteadOf "git@github.com:"
git submodule update --init --jobs 8
bash "$(dirname "$0")/patch-ws.sh" .
