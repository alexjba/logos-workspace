#!/bin/bash
# PreToolUse guard for the Mac venue. Inert unless FLEET_VENUE=mac.
# Blocks system-level and device-destructive commands and enforces the device allowlists
# from .sandcastle/devices.env (empty list = no device may be addressed).
case "${FLEET_VENUE:-linux}" in mac|all) ;; *) exit 0 ;; esac

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
[[ -n "$COMMAND" ]] || exit 0

block() { echo "BLOCKED by mac-guard: $1. Command: $COMMAND" >&2; exit 2; }

PATTERNS=(
  "(^|[;&| ])sudo "
  "rm -[a-zA-Z]*r[a-zA-Z]* +(/|~)"
  "adb( -s [^ ]+)? (reboot|root|unroot|sideload|remount|disable-verity|uninstall)"
  "adb( -s [^ ]+)? shell +(rm|su|reboot|pm uninstall|wipe)"
  "(^|[;&| ])fastboot "
  "simctl +(delete|erase)"
  "(^|[;&| ])security "
  "defaults write"
  "(^|[;&| ])launchctl "
  "(^|[;&| ])diskutil "
  "(^|[;&| ])csrutil "
  "(^|[;&| ])killall "
)
for p in "${PATTERNS[@]}"; do
  if printf '%s' "$COMMAND" | grep -qE "$p"; then block "matches '$p'"; fi
done

ENVFILE="${CLAUDE_PROJECT_DIR:-.}/.sandcastle/devices.env"
[[ -f "$ENVFILE" ]] && source "$ENVFILE"

# adb -s <serial>: serial must be allowlisted.
for serial in $(printf '%s' "$COMMAND" | grep -oE 'adb +-s +[^ ]+' | awk '{print $3}'); do
  [[ " ${FLEET_ANDROID_SERIALS:-} " == *" $serial "* ]] || block "android device '$serial' is not in FLEET_ANDROID_SERIALS"
done
# simctl <verb> <UDID>: any UDID-shaped token must be allowlisted.
if printf '%s' "$COMMAND" | grep -qE 'simctl'; then
  for udid in $(printf '%s' "$COMMAND" | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}'); do
    [[ " ${FLEET_IOS_UDIDS:-} " == *" $udid "* ]] || block "simulator/device '$udid' is not in FLEET_IOS_UDIDS"
  done
fi
exit 0
