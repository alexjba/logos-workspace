#!/bin/bash
# Make scripts/ws honour FLEET_ORG when generating flake input URLs. Idempotent.
# Usage: patch-ws.sh <monorepo-root>
set -eu
ws="${1:-.}/scripts/ws"
[[ -f "$ws" ]] || { echo "not found: $ws" >&2; exit 1; }
grep -q 'FLEET_ORG' "$ws" && exit 0
grep -q '^get_base_repo_url() {' "$ws" || { echo "get_base_repo_url not found in $ws" >&2; exit 1; }
tmp=$(mktemp)
awk '
  /^get_base_repo_url\(\) \{/ {
    print "get_base_repo_url() {"
    print "  # fleet-kit: FLEET_ORG overrides the owner so pins resolve on the org forks."
    print "  if [[ -n \"${FLEET_ORG:-}\" ]]; then echo \"github:${FLEET_ORG}/$1\"; return; fi"
    next }
  { print }
' "$ws" > "$tmp"
cat "$tmp" > "$ws"
rm -f "$tmp"
echo "patched $ws"
