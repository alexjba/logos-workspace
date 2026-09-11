This is the Mac venue: macOS with Xcode, iOS simulators, `xcrun simctl`, and adb. Run `source .sandcastle/devices.env` first; it exports `FLEET_ANDROID_SERIALS`, `FLEET_IOS_UDIDS`, and `ANDROID_SERIAL`.

Rules:
- Only touch devices in those allowlists (`adb -s $ANDROID_SERIAL`, simulators by listed UDID). If a list is empty, that platform has no device available to you: build only, and say so in the issue.
- Never `adb reboot/root/sideload`, `fastboot`, `simctl delete/erase`, `sudo`, keychain (`security`), `defaults write`, `launchctl`. A guard hook blocks them.
- Simulators: `xcrun simctl boot <UDID>`, `xcrun simctl install/launch`, `xcrun simctl io <UDID> screenshot out.png`; shut down what you booted.
- `simctl launch --console-pty` (and `devicectl device process launch --console`) returns only when the app exits. For an app that stays alive after printing its result (smoke hosts, Shell preview), never wrap it in a long `timeout`: launch it with its output redirected to a file and in the background, wait for the result line with a bounded loop (`for i in $(seq 1 60); do grep -q "<result marker>" out.log && break; sleep 2; done`), then `xcrun simctl terminate <UDID> <bundle-id>` (or `devicectl device process terminate`).
- Builds and tests still go through `ws` (`ws build`, `ws test --auto-local`); nix works on darwin.
