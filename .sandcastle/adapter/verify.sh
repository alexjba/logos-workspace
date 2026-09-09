#!/bin/bash
# Usage: .sandcastle/adapter/verify.sh <repo...>   (repo = directory name under repos/)
set -eu
source "$(dirname "$0")/env.sh"
[[ $# -gt 0 ]] || { echo "usage: verify.sh <repo...>" >&2; exit 1; }
ws test "$@" --auto-local --quiet
