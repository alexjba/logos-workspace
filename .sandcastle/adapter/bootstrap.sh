#!/bin/bash
# Runs once per sandbox (onSandboxReady), from the monorepo root.
# Container-only steps are gated on the image marker /opt/nix-install.sh; on a
# host venue (SANDCASTLE_SANDBOX=none) the machine's own nix/gh/git config is used.
set -eu
if [[ -f /opt/nix-install.sh ]]; then
  if [[ ! -x /nix/var/nix/profiles/default/bin/nix ]]; then
    echo "bootstrap: installing single-user Nix into /nix"
    sh /opt/nix-install.sh --no-daemon --yes
  fi
  gh auth setup-git
  git config --global url."https://github.com/".insteadOf "git@github.com:"
fi
source "$(dirname "$0")/env.sh"
command -v nix >/dev/null || { echo "bootstrap: nix not on PATH; install Nix on this host" >&2; exit 1; }
command -v gh >/dev/null || { echo "bootstrap: gh not on PATH" >&2; exit 1; }
git submodule update --init --jobs 8
bash "$(dirname "$0")/patch-ws.sh" .
