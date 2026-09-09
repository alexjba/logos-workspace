# Agent Fleet Workflow (logos-fleet/logos-workspace)

This fork and every submodule fork under the `logos-fleet` org exist for autonomous agents.
Humans upstream changes to the original orgs manually; agents never do.

## Landing model

- Every submodule's `origin` is `https://github.com/logos-fleet/<repo>.git`. All PRs are fork-internal.
- Branch name everywhere: `sandcastle/issue-<N>`, in the monorepo and in every touched sub-repo.
- A sub-repo change is landed only through a monorepo **pin commit** (gitlink + generated pin files). The merger lands sub-repo PRs first, then the monorepo PR (`Closes #N`).
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

- **One venue at a time.** Branch names are deterministic and the planner does no claiming; concurrent loops collide.

## Guardrails

`.claude/hooks/block-dangerous-git.sh` blocks force-push and history rewrites for every agent. Plain `git push` and PRs are allowed.
