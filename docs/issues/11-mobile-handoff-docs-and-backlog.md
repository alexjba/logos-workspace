# 11 · MOBILE-HANDOFF.md, workspace docs, follow-up backlog

## What to build

The document basecamp's README has linked to since the Shell preview landed
and which never existed. `MOBILE-HANDOFF.md` in basecamp: what runs on mobile
today (Shell preview, widget host), how the pipeline is shaped (toolchains
in logos-nix, packaging in basecamp, `ws run --target` in the workspace),
the purity boundary on iOS and the Xcode gate, how to refresh the gradle lock,
how to add an ABI, and what is deliberately out (UI apps, the runtime, a
mobile-shaped UI). Workspace `CLAUDE.md` and logos-nix README get their
sections. Then file the follow-ups so they are not lost:

- 1b: QML-root Shell host over `QGuiApplication` + `QQuickWindow`, done on
  desktop first, Shell contract change from `QWidget*` to a QML root.
- ADR 0007 iOS: spike on patching Qt's iOS shared-library gate, or an
  umbrella dynamic framework, versus adopting the static-link fallback for
  modules.
- Release track: signed APK/IPA, fastlane match, store distribution.
- Linux CI emulator smoke test and a `logos-qt-mcp` inspector UI test on the
  simulator once the QML-root host exists.

## Acceptance criteria

- [ ] `MOBILE-HANDOFF.md` exists in basecamp and the README link resolves; it names every command a new developer runs, in order, on a clean Mac and on WSL.
- [ ] Workspace `CLAUDE.md` documents `--target` and `--device`; logos-nix README documents the pseudo-systems and the cross pin.
- [ ] The four follow-ups above exist as issues (GitHub, once we go there) with a one-paragraph scope each and a pointer to `docs/mobile-bring-up-plan.md`.
- [ ] `docs/mobile-bring-up-plan.md` status line updated to "milestone 1 done" with the date.

## Blocked by

- 05
- 08
