# Agent Fleet Workflow (logos-fleet/logos-workspace)

This fork and every submodule fork under the `logos-fleet` org exist for autonomous agents.
Humans upstream changes to the original orgs manually; agents never do.

## Landing model

- Every submodule's `origin` is `https://github.com/logos-fleet/<repo>.git`. All PRs are fork-internal.
- Branch name everywhere: `sandcastle/issue-<N>`, in the monorepo and in every touched sub-repo.
- A sub-repo change is landed only through a monorepo **pin commit** (gitlink + generated pin files). The merger lands sub-repo PRs first, then the monorepo PR (`Closes #N`). There is no CI gate on the forks: the adapter checks run in the implementer and reviewer sandboxes are the verification. `master` only blocks force-pushes and deletions.
- Forks are synced from upstream by a human: `fleet-sync-forks <monorepo>` from the kit.

## Sandcastle fleet

`.sandcastle/` runs unattended agents in Docker via sandcastle. The loop's behavior is defined by `.sandcastle/main.mts` and `.sandcastle/*-prompt.md`; review standards in `.sandcastle/CODING_STANDARDS.md`; repo-specific build/verify/pin scripts in `.sandcastle/adapter/`.

- **Task board:** label issues on `logos-fleet/logos-workspace` with **`fleet-smoke`**.
- **Credentials** (`.sandcastle/.env`, gitignored): `CLAUDE_CODE_OAUTH_TOKEN`, and `GH_TOKEN` scoped to the `logos-fleet` org.
- **Run (host venue, default):** on any machine with nix, gh, node and claude installed — your Mac, or a Linux box over ssh — from a clone of the fork:

  ```bash
  npm install
  SANDCASTLE_SANDBOX=none npm run sandcastle
  ```

  Agents run as plain processes in git worktrees under `.sandcastle/worktrees/`; the machine is the isolation boundary. The merge phase operates on this checkout, so start from a clean `master` and don't work in it while the loop runs.

- **Run (Docker venue, optional):** build the adapter image once, then `npm run sandcastle` without the env var. Needs `.sandcastle/adapter/mounts.json` for a persistent `/nix` store.

  ```bash
  docker build --provenance=false --sbom=false \
    --build-arg AGENT_UID=$(id -u) --build-arg AGENT_GID=$(id -g) \
    -t logos-workspace-agent:local .sandcastle
  ```

- **Models.** Per role from `fleet.env` (all four roles `claude-opus-5`); `FLEET_MODEL_<ROLE>` overrides at runtime.
- **Scope.** `FLEET_LABELS=a,b` (AND) and `FLEET_MILESTONE="..."` select the issues a run works; unset means the installed label (`fleet-smoke`). `FLEET_MAX_PARALLEL=N` caps concurrent issue pipelines.
- **Resuming after a usage limit.** An interrupted agent keeps its worktree when it left uncommitted work. Resume it in place (`claude --resume <session-id>` from that worktree, same model and `--permission-mode auto`), let it commit, pin and write its manifest, save `.fleet/manifest.json` as `<dir>/<issue>.json`, remove the worktree, and run the loop with `FLEET_MANIFEST_DIR=<dir>`: when the issue is next planned its implementer is skipped and the branch goes straight to review and merge (the saved file is renamed `.adopted`). While the agent runs outside the loop, remove the issue's `ready-for-agent` label so the planner does not collide with its worktree.
- **Venues.** Every loop is started with `FLEET_VENUE=linux` (default), `FLEET_VENUE=mac`, or `FLEET_VENUE=all` (one Mac covers everything). An issue runs on the Mac only if it carries the label `venue:mac`; everything else is Linux. One loop per venue may run at a time; two loops on the same venue collide on `sandcastle/issue-N`.
- **Mac venue guard.** `.claude/hooks/mac-guard.sh` is active under `FLEET_VENUE=mac` or `all`: it blocks `sudo`, keychain, `launchctl`, destructive `adb`/`fastboot`/`simctl` verbs, and any device not listed in `.sandcastle/devices.env`. Empty allowlists mean build-only.

## Guardrails

`.claude/hooks/block-dangerous-git.sh` blocks force-push and history rewrites for every agent. Plain `git push` and PRs are allowed.
