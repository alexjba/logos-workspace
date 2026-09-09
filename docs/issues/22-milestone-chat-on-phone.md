# 22 · Milestone: messaging on a phone from a catalog-assembled Bundled set

Milestone 1 (PRD: `docs/prd/store-shell-milestone-1.md`). User stories: 1, 2, 3.
Repos, landing order: logos-basecamp -> logos-workspace.

## What to build

`ws build logos-basecamp --target ios-arm64 --bundle chat_ui` (and the
Android equivalent) against the catalog release containing slice 21's
variants produces a Store shell that installs on the iPad and the Samsung,
shows the Shell with Chat, and exchanges messages with a desktop Basecamp
peer over the Logos network. This is the first demo of the track.

## Acceptance criteria

- [ ] The iPad and the Samsung each send and receive a message with a desktop peer in a group conversation.
- [ ] The app contains no Downloaded module; the Modules tab shows the Bundled set and their stats.
- [ ] Cold start to Shell shown, and to Chat usable, are logged on both devices.
- [ ] Screen recordings from both devices attached to the PR; one `ws` command per platform reproduces the build.

## Blocked by

- 20
- 21
