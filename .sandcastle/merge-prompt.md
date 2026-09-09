# TASK

Land the following monorepo branches autonomously via fork-internal pull requests in the `logos-fleet` org:

{{BRANCHES}}

Their issues:

{{ISSUES}}

Sub-repo work per issue (from each worktree's manifest):

{{MANIFESTS}}

# SETUP

Run `gh auth setup-git` once so `git push` works over HTTPS. You operate on the HOST's bind-mounted monorepo checkout. If it has uncommitted changes, `git stash` them now and restore them at the end.

**NEVER run builds or test suites in this phase.** Verification happened in the implementer and reviewer sandboxes; your job is rebase → push → PR → merge.

# PER ISSUE, IN ORDER

## 1. Sub-repo pull requests (from the manifest)

For each listed sub-repo with `pushed: true`, using only the GitHub API (no local checkout of the sub-repo is needed):

- First compare: `gh api repos/<fork>/compare/<base>...<branch> -q .ahead_by`. If `0`, the branch adds nothing over `<base>` (the pin points at commits already on the fork's default branch): there is nothing to land for this sub-repo, treat it as merged and continue.
- `gh pr create --repo <fork> --head <branch> --base <base> --title "<concise title>" --body "Part of logos-fleet/logos-workspace#<issue>. <summary>"`. If a PR already exists for that head, reuse it (`gh pr list --repo <fork> --head <branch>`).
- `gh pr view <n> --repo <fork> --json mergeable -q .mergeable`. If `CONFLICTING`: comment on the monorepo issue naming the sub-repo, do NOT open the monorepo PR for this issue, and continue with the next issue. The next cycle's implementer rebases.
- Otherwise `gh pr merge <n> --repo <fork> --merge` (sub-repo forks have no required checks; the merge is immediate).

A manifest entry with `pushed: false` or `pinned: false` means the implementer did not finish; comment on the issue and skip the issue entirely.

## 2. Monorepo pull request

Only when every sub-repo PR for the issue merged (or the issue touched no sub-repo):

1. `git fetch origin && git rebase origin/master <branch>` (via `git checkout <branch>`). Resolve conflicts by reading both sides; never resolve a gitlink conflict by guessing: keep the branch's gitlink. No builds.
2. `git push -u origin <branch>`. If rejected as non-fast-forward, `git pull --rebase origin <branch>` and push again. Never force-push.
3. `gh pr create --repo logos-fleet/logos-workspace --base master --head <branch> --title "<concise title>" --body "..."`. The body must include `Closes #<issue>` and a short summary of what was done, which sub-repo PRs landed, and how it was verified.
4. Arm auto-merge immediately: `gh pr merge <n> --repo logos-fleet/logos-workspace --auto --merge`. Do NOT `--watch`; move on.

# AFTER ALL ISSUES

One bounded confirmation pass: poll `gh pr view <n> --repo logos-fleet/logos-workspace --json state,mergeStateStatus` per monorepo PR, at most 6 polls with `sleep 20`, never `--watch`.
- MERGED → done.
- A check failed → comment on the issue with the failing check name and a one-line diagnosis; leave the PR open.
- Still pending → leave auto-merge armed, comment on the issue, finish.

Leave the host checkout as you found it: `git checkout master && git fetch origin && git merge --ff-only origin/master`, then `git stash pop` if you stashed.

Do not close issues manually. Report per-issue outcomes (sub-repo PRs merged, monorepo PR merged / left open + why).

Once every issue is handled, output <promise>COMPLETE</promise>.
