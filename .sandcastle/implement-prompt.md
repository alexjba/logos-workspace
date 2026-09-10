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
   - Then bring it up to date: `git -C repos/<x> fetch origin <default> && git -C repos/<x> merge origin/<default>`
     (merge, never rebase: the branch may already be on the remote and in an open PR). Resolve
     conflicts by reading both sides, re-verify, and push. If an open fork PR for this branch was
     reported `CONFLICTING` on the issue, this merge is the reason you were re-planned: make the
     PR mergeable before anything else.
2. Commit in the sub-repo, then push: `git -C repos/<x> push -u origin {{BRANCH}}`.
3. After sub-repo work is verified, PIN it in the monorepo (see ENVIRONMENT below): the
   monorepo commit must include the updated gitlink for every touched sub-repo. A
   sub-repo change without a monorepo pin commit is invisible to the pipeline and is discarded.
4. Write `.fleet/manifest.json` at the monorepo root before finishing (create the directory). `.fleet/` is gitignored on purpose: the loop reads the file from your worktree, so never `git add` it (not even with `-f`):

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
- A single Bash call may run for up to 60 minutes (pass `timeout` in ms, max 3600000). For anything
  longer, start it detached (`nohup ... > log 2>&1 &`) and poll the log from the foreground in calls
  shorter than 60 minutes. Never leave the session silent for over an hour, the harness aborts an
  agent that produces no output for that long.
- When waiting for a detached command, make it write its own end marker and wait for that, with a
  bound: `nohup sh -c '<cmd>; echo "EXIT=$?"' > /tmp/x.log 2>&1 &` then
  `for i in $(seq 1 360); do grep -q '^EXIT=' /tmp/x.log && break; sleep 10; done`. Never wait on the
  tool's own wording (`ws` colours its OK/FAIL lines, so `OK$` never matches) and never on
  `pgrep -f "<command text>"` (it can match the shell running your wait loop).

# HEADLESS SESSION

You run non-interactively: the session ends the moment you end your turn, and nothing resumes it.
Never end a turn to "wait for a background task" or "be notified"; nothing will notify you. Do not
use `run_in_background`. Every build, test, commit, push and pin must finish inside your turn, and
the last thing you output is the completion promise below.

# PIN

After sub-repo commits are pushed: `.sandcastle/adapter/pin.sh <repo...>` stages the gitlinks and regenerates `nix/dep-graph.nix`, `flake.nix`, `flake.lock`. Then commit the monorepo. Do not hand-edit `flake.nix` input URLs; they are generated and point at `logos-fleet`.

# COMMIT STYLE

`<type>(<scope>): summary` with types feat/fix/chore/docs; scope is the sub-repo name or `workspace`.


# VENUE: {{VENUE}}

!`cat .sandcastle/adapter/ENVIRONMENT.{{VENUE}}.md`

# COMMIT

Monorepo commit message: adapter style above, reference the issue (`#{{TASK_ID}}`), key decisions, files changed, blockers or notes for the next iteration. Keep it concise. Sub-repo commits follow the same style.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done and which acceptance criteria remain, and label the issue `partial`: `gh issue edit {{TASK_ID}} --repo logos-fleet/logos-workspace --add-label partial`. The merger then lands your branch without closing the issue and a later cycle continues it. If you complete every remaining criterion, remove the label (`--remove-label partial`).

A criterion that only the other venue can verify (e.g. "Linux CI" while you run on the Mac) is not a reason for `partial`, which would re-plan the issue here forever. Verify everything this venue can, then open a follow-up issue for the rest (`gh issue create --repo logos-fleet/logos-workspace --label milestone-1`, no `ready-for-agent`, stating the criterion, the command and why this venue cannot run it) and link it in your comment.

Do not close the issue.

Do not add `Co-Authored-By` trailers to commits.

Once complete, output <promise>COMPLETE</promise>.

# FINAL RULES

ONLY WORK ON A SINGLE TASK. Report actual results honestly. Never claim a check you did not run.
