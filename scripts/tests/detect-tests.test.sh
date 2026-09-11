#!/usr/bin/env bash
# Unit tests for scripts/_detect-tests — the `hasTests` detection behind
# `ws sync-graph`.  Run: scripts/tests/detect-tests.test.sh
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/_detect-tests
source "$ROOT/scripts/_detect-tests"

pass=0; fail=0
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# mkdir_repo <name> creates an empty repo dir and sets REPO_DIR.
mkdir_repo() { REPO_DIR="$T/$1"; mkdir -p "$REPO_DIR"; }

# mkrepo <name> does the same, then reads the repo's flake.nix from stdin.
mkrepo() { mkdir_repo "$1"; cat > "$REPO_DIR/flake.nix"; }

# expect <label> <expected 0|1>  — checks flake_declares_tests "$REPO_DIR"
expect() {
  local label="$1" want="$2" got
  flake_declares_tests "$REPO_DIR" && got=0 || got=1
  if [[ "$got" == "$want" ]]; then
    pass=$((pass + 1)); echo "  ok   $label"
  else
    fail=$((fail + 1)); echo "  FAIL $label (want $want, got $got)"
  fi
}

mkrepo explicit-checks <<'NIX'
{
  outputs = { self }: {
    checks = { x86_64-linux.tests = 1; };
  };
}
NIX
expect "flake with an explicit checks output" 0

mkrepo mklogosmodule-tests <<'NIX'
{
  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosModule {
      src = ./.;
      tests = {
        dir = ./tests;
        mockCLibs = ["gowalletsdk"];
      };
    };
}
NIX
expect "mkLogosModule { tests = ...; } yields checks.<sys>.unit-tests" 0

mkrepo no-tests <<'NIX'
{
  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosModule {
      src = ./.;
      configFile = ./metadata.json;
    };
}
NIX
expect "module without a tests attribute" 1

mkrepo commented-tests <<'NIX'
{
  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosModule {
      src = ./.;
      # tests = { dir = ./tests; };
    };
}
NIX
expect "a commented-out tests attribute is not a test" 1

mkrepo other-tests-attrs <<'NIX'
{
  outputs = inputs@{ nixpkgs, ... }: {
    packages.x86_64-linux.unit-tests = 1;
    packages.x86_64-linux.integration-tests = 2;
    testsPackage = system: 3;
  };
}
NIX
expect "attributes merely ending in -tests are not a tests attribute" 1

mkdir_repo missing-flake
expect "a repo without a flake.nix has no tests" 1

mkrepo qml-with-mjs <<'NIX'
{
  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosQmlModule {
      src = ./.;
      configFile = ./metadata.json;
    };
}
NIX
mkdir -p "$REPO_DIR/tests" && : > "$REPO_DIR/tests/basic.mjs"
expect "mkLogosQmlModule + tests/*.mjs yields checks.<sys>.integration-test" 0

mkrepo qml-without-mjs <<'NIX'
{
  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosQmlModule {
      src = ./.;
      configFile = ./metadata.json;
    };
}
NIX
mkdir -p "$REPO_DIR/tests" && : > "$REPO_DIR/tests/helper.qml"
expect "mkLogosQmlModule with a tests/ dir but no .mjs file" 1

echo "passed: $pass  failed: $fail"
[[ $fail -eq 0 ]]
