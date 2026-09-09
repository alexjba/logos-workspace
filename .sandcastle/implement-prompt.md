# TASK

Fix issue {{TASK_ID}}: {{ISSUE_TITLE}}

Pull in the issue using `gh issue view {{TASK_ID}} --repo logos-fleet/logos-workspace`. If it has a parent PRD, pull that in too.

Only work on the issue specified.

# WHERE YOU ARE

You are in a worktree of the monorepo fork `logos-fleet/logos-workspace` on branch `{{BRANCH}}`.
Dependencies live under `repos/` as git submodules. Every submodule's `origin` is a fork
under the `logos-fleet` org. **Never push to any other org.**

Run once: `gh auth setup-git`.

# CONTEXT

Last 10 monorepo commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information. Pay extra attention to test files that touch the relevant parts of the code.

# EXECUTION

If applicable, use RGR: RED (one failing test), GREEN (minimal implementation), repeat, REFACTOR.

# MULTI-REPO RULES

1. Before editing a sub-repo at `repos/<x>`:
   - `git -C repos/<x> fetch origin`
   - If `origin/{{BRANCH}}` exists (earlier cycle), `git -C repos/<x> checkout {{BRANCH}}` and `git -C repos/<x> pull --rebase origin {{BRANCH}}`.
   - Else `git -C repos/<x> checkout -b {{BRANCH}}` from the fork's default branch.
2. Commit in the sub-repo, then push: `git -C repos/<x> push -u origin {{BRANCH}}`.
3. After sub-repo work is verified, PIN it in the monorepo (see ENVIRONMENT below): the
   monorepo commit must include the updated gitlink for every touched sub-repo. A
   sub-repo change without a monorepo pin commit is invisible to the pipeline and is discarded.
4. Write `.fleet/manifest.json` at the monorepo root before finishing (create the directory):

```json
{
  "issue": "{{TASK_ID}}",
  "branch": "{{BRANCH}}",
  "repos": [
    { "path": "repos/<x>", "fork": "logos-fleet/<x>", "branch": "{{BRANCH}}", "base": "<fork default branch>", "pushed": true }
  ],
  "pinned": true
}
```
   `repos` lists every sub-repo you committed to; `base` is that fork's default branch (`gh api repos/logos-fleet/<x> -q .default_branch`); `pinned` is true only if the monorepo commit contains the gitlink updates. If you touched no sub-repo, write `"repos": []` and `"pinned": false`.

# ENVIRONMENT

You are in a Linux container with Nix (flakes enabled, sandbox off) and the logos-co binary cache. All builds go through `ws` (`scripts/ws`); never run raw cmake. Source `.sandcastle/adapter/env.sh` first in every shell (it exports `FLEET_ORG` and PATH).

Submodules are initialized by the sandbox bootstrap. If `repos/` is empty, run `git submodule update --init --jobs 8`.

Read `CLAUDE.md` for the `ws` CLI. Key facts: `--auto-local` overrides flake inputs with the local checkouts under `repos/`, so a sub-repo change is testable without any pin. `ws graph <repo>` shows dependents.

# FEEDBACK LOOPS

- Verify touched sub-repos: `.sandcastle/adapter/verify.sh <repo...>` (runs `ws test <repo...> --auto-local`). Also test at least one direct dependent (`ws graph <repo>`).
- First builds are slow (minutes); do not abort them. Cache hits make later builds fast.

# PIN

After sub-repo commits are pushed: `.sandcastle/adapter/pin.sh <repo...>` stages the gitlinks and regenerates `nix/dep-graph.nix`, `flake.nix`, `flake.lock`. Then commit the monorepo. Do not hand-edit `flake.nix` input URLs; they are generated and point at `logos-fleet`.

# COMMIT STYLE

`<type>(<scope>): summary` with types feat/fix/chore/docs; scope is the sub-repo name or `workspace`.


# COMMIT

Monorepo commit message: adapter style above, reference the issue (`#{{TASK_ID}}`), key decisions, files changed, blockers or notes for the next iteration. Keep it concise. Sub-repo commits follow the same style.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done.

Do not close the issue.

Once complete, output <promise>COMPLETE</promise>.

# FINAL RULES

ONLY WORK ON A SINGLE TASK. Report actual results honestly. Never claim a check you did not run.
