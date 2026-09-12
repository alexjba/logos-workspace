#!/usr/bin/env bash
# Unit tests for scripts/_mobile-target — the variant and app vocabularies, and
# the flake attribute `ws build --target` resolves a mobile artifact through.
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
  got=$("$@" 2>"$err") || got="die: $(head -1 "$err")"
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

# Why the two Android routes differ from the iOS one is in _mobile-target's
# own header; what is asserted here is that the host is what picks the key.
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

# `ws run --app` picks which of the two apps carries the Bundled set. Every
# pair has a build today, so what the table asserts is the NAMES -- a runner
# renamed on one side of the flake and not here is the failure this catches.
echo "run_app_for"
expect "smoke on the simulator" "run-liblogos-smoke-ios-sim"    run_app_for smoke ios-sim-arm64
expect "smoke on an iOS device" "run-liblogos-smoke-ios-device" run_app_for smoke ios-arm64
expect "smoke on Android"       "run-liblogos-smoke-android"    run_app_for smoke android-arm64
expect "shell on the simulator" "run-basecamp-shell-ios-sim"    run_app_for shell ios-sim-arm64
expect "shell on an iOS device" "run-basecamp-shell-ios-device" run_app_for shell ios-arm64
expect "shell on Android"       "run-basecamp-shell-android"    run_app_for shell android-arm64
expect "an app with no build for the target" "die: " run_app_for shell wear-arm64

# What `ws run` prints when a pair has no build. Derived from run_app_for, so
# this is also the assertion that both apps build for every known target.
echo "targets_for_app"
expect "smoke" "$KNOWN_TARGETS" targets_for_app smoke
expect "shell" "$KNOWN_TARGETS" targets_for_app shell
expect "an app nothing builds" "" targets_for_app ghost

echo "is_known_app"
expect "smoke"      "" is_known_app smoke
expect "shell"      "" is_known_app shell
expect "a typo" "die: " is_known_app shel

echo
echo "$pass passed, $fail failed"
[[ $fail -eq 0 ]]
