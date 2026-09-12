#!/usr/bin/env bash
# Unit tests for scripts/_run-checks — how `ws test` builds a repo's checks.
# Builds tiny fixture flakes with real nix.  Run: scripts/tests/run-checks.test.sh
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/_run-checks
source "$ROOT/scripts/_run-checks"

# The pieces of scripts/ws that run_checks_batched relies on.
GREEN="" RED="" YELLOW="" NC=""
log() { :; }
run_nix_test() { nix "$@" 2>/dev/null; }

SYSTEM=$(nix eval --extra-experimental-features nix-command --impure --raw --expr builtins.currentSystem)
pass=0; fail=0
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# mkflake <name> <checks attrset body>: a flake whose checks.<system> is the body.
# ok/bad are derivations that succeed/fail; nonce keeps a fixture from a
# previous run out of the store.
mkflake() {
  mkdir -p "$T/$1"
  cat > "$T/$1/flake.nix" <<NIX
{
  outputs = { self }: let
    mk = name: script: derivation {
      inherit name; system = "$SYSTEM"; builder = "/bin/sh";
      args = [ "-c" script ]; nonce = "$$-$RANDOM";
    };
    ok = name: mk name "echo ok > \$out";
    bad = name: mk name "exit 1";
  in { checks."$SYSTEM" = { $2 }; };
}
NIX
}

# expect <label> <want-rc> <want-output-lines...> — runs the batch captured in OUT/RC.
expect() {
  local label="$1" want_rc="$2"; shift 2
  local ok=true line
  [[ "$RC" == "$want_rc" ]] || ok=false
  for line in "$@"; do grep -qxF "  $line" <<< "$OUT" || ok=false; done
  if $ok; then pass=$((pass + 1)); echo "  ok   $label"
  else fail=$((fail + 1)); echo "  FAIL $label (rc=$RC)"; while IFS= read -r l; do echo "       $l"; done <<< "$OUT"; fi
}

run() { OUT=$(run_checks_batched "$1" "$SYSTEM" "" fx "${@:2}"); RC=$?; }

mkflake allpass 'a = ok "a"; b = ok "b";'
run "path:$T/allpass#checks.$SYSTEM." a b
expect "every check passes -> rc 0" 0 "PASS fx a" "PASS fx b"

mkflake onefails 'a = ok "a"; bad = bad "bad"; c = ok "c";'
run "path:$T/onefails#checks.$SYSTEM." a bad c
expect "a failing build does not stop the checks after it" 1 "PASS fx a" "FAIL fx bad" "PASS fx c"

mkflake evalerror 'a = ok "a"; broken = throw "boom";'
run "path:$T/evalerror#checks.$SYSTEM." a broken
expect "a check that fails to evaluate falls back to one at a time" 1 "PASS fx a" "FAIL fx broken"

# Workspace-style refs prefix each check name with "<input>--".
mkflake prefixed '"repo--a" = ok "a"; "repo--b" = bad "b";'
run "path:$T/prefixed#checks.$SYSTEM.repo--" a b
expect "a workspace <input>-- prefix is kept when reading paths back" 1 "PASS fx a" "FAIL fx b"

# A check that depends on a failing derivation which is not itself a check
# (the shape of basecamp's shutdown-test over the .app integration run).
# shellcheck disable=SC2016 # the single quotes hold a Nix expression
mkflake depfails 'a = ok "a"; user = let d = bad "dep"; in mk "user" "cat ${d} > \$out";'
run "path:$T/depfails#checks.$SYSTEM." a user
expect "a check whose dependency fails is a FAIL, not a PASS" 1 "PASS fx a" "FAIL fx user"

# A builder that creates $out and then fails can leave that directory in the
# store, unregistered. It must still be a FAIL (the #67 false PASS).
# shellcheck disable=SC2016 # the single quotes hold a Nix expression
mkflake leaky 'a = ok "a"; leaky = mk "leaky" "mkdir -p \$out; echo partial > \$out/x; exit 1";'
run "path:$T/leaky#checks.$SYSTEM." a leaky
expect "a failed build that left its output directory behind is a FAIL" 1 "PASS fx a" "FAIL fx leaky"

echo "$pass passed, $fail failed"
[[ $fail -eq 0 ]]
