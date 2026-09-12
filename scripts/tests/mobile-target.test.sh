#!/usr/bin/env bash
# Unit tests for scripts/_mobile-target — the variant vocabulary and the flake
# attribute `ws build --target` resolves a mobile artifact through.
# Run: scripts/tests/mobile-target.test.sh
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/_mobile-target
source "$ROOT/scripts/_mobile-target"

pass=0; fail=0

# expect <label> <want> <cmd...> — the command's stdout, or "die: <line 1 of
# stderr>" when it exits non-zero. A refusal is an answer this file asserts on
# just like a path, because "which host cannot build Android" is the whole
# point of the aarch64-linux case below.
expect() {
  local label="$1" want="$2"; shift 2
  local got err
  err=$(mktemp)
  if got=$("$@" 2>"$err"); then :; else got="die: $(head -1 "$err")"; fi
  rm -f "$err"
  if [[ "$got" == "$want" ]]; then
    pass=$((pass + 1)); echo "  ok   $label"
  else
    fail=$((fail + 1)); echo "  FAIL $label"; echo "       want: $want"; echo "       got:  $got"
  fi
}

echo "host_to_system"
expect "darwin arm64"  "aarch64-darwin" host_to_system Darwin arm64
expect "linux x86_64"  "x86_64-linux"   host_to_system Linux x86_64
expect "linux aarch64" "aarch64-linux"  host_to_system Linux aarch64

echo "target_to_system"
expect "ios device"    "aarch64-ios"           target_to_system ios-arm64
expect "ios simulator" "aarch64-ios-simulator" target_to_system ios-sim-arm64
expect "android"       "aarch64-android"       target_to_system android-arm64

echo "mobile_build_ref — iOS is keyed by the pseudo-system alone"
expect "ios sim on a mac" \
  "packages.aarch64-ios-simulator.logos-basecamp--bundled-set" \
  mobile_build_ref logos-basecamp ios-sim-arm64 bundled-set aarch64-darwin
expect "ios device on a mac" \
  "packages.aarch64-ios.logos-basecamp--bundled-set" \
  mobile_build_ref logos-basecamp ios-arm64 bundled-set aarch64-darwin

# An Android cross derivation's `system` is its BUILD platform, and
# packages.aarch64-android carries the canonical x86_64-linux one -- which a
# Mac cannot realise even though the closure is identical. legacyPackages is
# keyed by the platform that BUILDS, so it is the only route that works on
# both hosts.
echo "mobile_build_ref — Android is keyed by the host that builds it"
expect "android on a mac" \
  "legacyPackages.aarch64-darwin.logos-basecamp.mobile.aarch64-android.bundled-set" \
  mobile_build_ref logos-basecamp android-arm64 bundled-set aarch64-darwin
expect "android on linux" \
  "legacyPackages.x86_64-linux.logos-basecamp.mobile.aarch64-android.bundled-set" \
  mobile_build_ref logos-basecamp android-arm64 bundled-set x86_64-linux
expect "android on a host with no Android build set" \
  "die: Error: no Android build set for 'aarch64-linux'" \
  mobile_build_ref logos-basecamp android-arm64 bundled-set aarch64-linux
expect "a non-default output" \
  "legacyPackages.aarch64-darwin.logos-basecamp.mobile.aarch64-android.liblogos-smoke-android" \
  mobile_build_ref logos-basecamp android-arm64 liblogos-smoke-android aarch64-darwin

echo
echo "$pass passed, $fail failed"
[[ $fail -eq 0 ]]
