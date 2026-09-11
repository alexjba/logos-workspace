#!/bin/bash
# Usage: .sandcastle/adapter/verify.sh <repo...>   (repo = directory name under repos/)
#
# Tests each named repo's local checkout. `--auto-local` alone overrides only sub-repos with
# uncommitted or unpushed work, so a sub-repo branch that is committed and pushed but not yet
# pinned would be tested at the OLD pin while reporting PASS. A named repo whose checkout is
# strictly ahead of the gitlink the monorepo index pins is therefore passed to --local too.
# (A checkout that lags its pin, e.g. after a monorepo merge without `git submodule update`,
# is left alone: overriding with it would test older code.)
# VERIFY_DRY_RUN=1 prints the ws command instead of running it.
set -eu
source "$(dirname "$0")/env.sh"
[[ $# -gt 0 ]] || { echo "usage: verify.sh <repo...>" >&2; exit 1; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

ahead=()
for repo in "$@"; do
  dir="$ROOT/repos/$repo"
  head=$(git -C "$dir" rev-parse HEAD 2>/dev/null) || continue
  pinned=$(git -C "$ROOT" ls-files -s "repos/$repo" | awk '{print $2}')
  [[ -n "$pinned" && "$head" != "$pinned" ]] || continue
  git -C "$dir" merge-base --is-ancestor "$pinned" "$head" 2>/dev/null && ahead+=("$repo")
done

cmd=(ws test "$@" --auto-local --quiet)
if [[ ${#ahead[@]} -gt 0 ]]; then
  echo "verify.sh: testing the local checkout of ${ahead[*]} (ahead of its pinned gitlink)" >&2
  cmd+=(--local "${ahead[@]}")
fi
if [[ "${VERIFY_DRY_RUN:-}" == 1 ]]; then echo "${cmd[*]}"; else "${cmd[@]}"; fi
