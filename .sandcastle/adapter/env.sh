#!/bin/bash
# Source from the monorepo root inside the sandbox.
export FLEET_ORG="logos-fleet"
export PATH="$PWD/scripts:/nix/var/nix/profiles/default/bin:$HOME/.nix-profile/bin:$PATH"
export NIX_CONFIG="experimental-features = nix-command flakes"
