#!/usr/bin/env bash
# Unit tests for scripts/_repo-type — the `--type` filter behind
# `ws test --all --type cpp`.  Run: scripts/tests/repo-type.test.sh
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/_repo-type
source "$ROOT/scripts/_repo-type"

pass=0; fail=0
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# mkrepo <name> <path...> creates a repo dir with each path as an empty file
# (directories in a path are created), and sets REPO_DIR.
mkrepo() {
  REPO_DIR="$T/$1"; shift
  mkdir -p "$REPO_DIR"
  for f in "$@"; do mkdir -p "$(dirname "$REPO_DIR/$f")"; : > "$REPO_DIR/$f"; done
}

# expect <label> <type> <want yes|no|unknown> -- the three answers
# repo_matches_type has, named rather than spelled as exit statuses.
expect() {
  local label="$1" type="$2" want="$3" rc=0 got
  repo_matches_type "$REPO_DIR" "$type" || rc=$?
  case $rc in
    0) got=yes ;;
    2) got=unknown ;;
    *) got=no ;;
  esac
  if [[ "$got" == "$want" ]]; then
    pass=$((pass + 1)); echo "  ok   $label"
  else
    fail=$((fail + 1)); echo "  FAIL $label (want $want, got $got)"
  fi
}

echo "cpp"

mkrepo cpp-root CMakeLists.txt src/main.cpp
expect "a CMakeLists.txt at the root" cpp yes

# THE ONE THIS FILE WAS WRITTEN FOR. A repo whose C++ is in subprojects has no
# root CMakeLists.txt, and `--type cpp` used to skip it in silence -- seven of
# this workspace's C++ repos, named in scripts/_repo-type, among them the one
# holding the Native container suite.
mkrepo cpp-subproject cpp/CMakeLists.txt cpp/src/main.cpp README.md
expect "a CMakeLists.txt one level down" cpp yes

mkrepo cpp-two-subprojects tests/CMakeLists.txt lib/CMakeLists.txt
expect "several subprojects, no root CMakeLists.txt" cpp yes

# Depth stops at one. A nix repo that vendors somebody else's C++ three levels
# down is not a C++ repo, and a filter that walked the whole tree would drag in
# every repo with a fixture in it.
mkrepo cpp-deep a/b/CMakeLists.txt
expect "a CMakeLists.txt two levels down is not enough" cpp no

mkrepo not-cpp flake.nix README.md
expect "no CMakeLists.txt anywhere" cpp no

mkrepo cmake-alias modules/CMakeLists.txt
expect "the cmake alias for the same type" cmake yes

echo "the other types"

mkrepo rust Cargo.toml src/lib.rs
expect "Cargo.toml at the root" rust yes
expect "a Rust repo is not a C++ one" cpp no

mkrepo nim thing.nimble
expect "a .nimble at the root" nim yes

mkrepo js package.json
expect "package.json at the root" js yes

mkrepo qml-files Main.qml
expect "a .qml at the root" qml yes

mkrepo qml-via-cmake CMakeLists.txt
printf 'qt_add_qml_module(foo)\n' > "$REPO_DIR/CMakeLists.txt"
expect "a root CMakeLists.txt that mentions qml" qml yes

# Same reach as cpp: a qml subproject is found the same way its CMakeLists.txt
# is, or the two filters disagree about the same repo.
mkrepo qml-subproject ui/CMakeLists.txt
printf 'qt_add_qml_module(foo)\n' > "$REPO_DIR/ui/CMakeLists.txt"
expect "a subproject CMakeLists.txt that mentions qml" qml yes

mkrepo qml-none CMakeLists.txt
expect "a CMakeLists.txt with no qml in it" qml no

echo "unknown types"

# Its own answer, not "no": a typo has to reach the caller as an error rather
# than as a run that quietly tested nothing.
mkrepo whatever CMakeLists.txt
expect "an unknown type is rejected, not silently skipped" cobol unknown

echo ""
echo "$pass passed, $fail failed"
[[ "$fail" -eq 0 ]]
