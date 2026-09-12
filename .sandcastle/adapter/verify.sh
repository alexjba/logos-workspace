#!/bin/bash
# Usage: .sandcastle/adapter/verify.sh <repo...>   (repo = directory name under repos/)
#
# Tests each named repo's local checkout. Two facts shape this:
#
#  1. `--auto-local` overrides a sub-repo only when it has uncommitted or unpushed work, so a
#     branch that is committed AND pushed gets no override and the run tests the OLD pin while
#     reporting PASS. A named repo whose checkout is strictly ahead of the gitlink the monorepo
#     index pins is therefore passed to --local as well.
#  2. For some repos a `path:` override breaks their own checks whatever the content: overriding
#     logos-basecamp fails host-services-test, integration-test, qml-tests and shutdown-test on a
#     pristine tree (11/15, vs 15/15 from its pin). Neither choice tests the new code there, so
#     this script refuses instead of reporting a meaningless result: push, run pin.sh, commit, and
#     verify the pin with a clean tree. FLEET_NO_PATH_OVERRIDE overrides the list.
#
# A checkout that lags its pin (e.g. after a monorepo merge without `git submodule update`) is
# left alone: overriding with it would test older code.
# VERIFY_DRY_RUN=1 prints the ws command instead of running it.
set -eu
# shellcheck source=/dev/null
source "$(dirname "$0")/env.sh"
[[ $# -gt 0 ]] || { echo "usage: verify.sh <repo...>" >&2; exit 1; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NO_PATH_OVERRIDE="${FLEET_NO_PATH_OVERRIDE:-logos-basecamp}"

ahead=()
for repo in "$@"; do
  dir="$ROOT/repos/$repo"
  head=$(git -C "$dir" rev-parse HEAD 2>/dev/null) || continue
  pinned=$(git -C "$ROOT" ls-files -s "repos/$repo" | awk '{print $2}')
  [[ -n "$pinned" && "$head" != "$pinned" ]] || continue
  git -C "$dir" merge-base --is-ancestor "$pinned" "$head" 2>/dev/null || continue
  case " $NO_PATH_OVERRIDE " in
    *" $repo "*)
      cat >&2 <<MSG
verify.sh: refusing to run — $repo is committed ahead of its pin (${head:0:9} vs ${pinned:0:9}).
  A path: override of $repo fails its own UI checks whatever the content, and without one this
  run would test the OLD pin and report PASS for code you did not change. Pin first:
    git -C repos/$repo push origin <branch> && .sandcastle/adapter/pin.sh $repo
    git commit -m 'chore(workspace): re-pin $repo' && .sandcastle/adapter/verify.sh $*
MSG
      exit 3 ;;
  esac
  ahead+=("$repo")
done

cmd=(ws test "$@" --auto-local --quiet)
if [[ ${#ahead[@]} -gt 0 ]]; then
  echo "verify.sh: testing the local checkout of ${ahead[*]} (ahead of its pinned gitlink)" >&2
  cmd+=(--local "${ahead[@]}")
fi
if [[ "${VERIFY_DRY_RUN:-}" == 1 ]]; then echo "${cmd[*]}"; else "${cmd[@]}"; fi
