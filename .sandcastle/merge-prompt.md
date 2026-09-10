# TASK

Land the following monorepo branches autonomously via fork-internal pull requests in the `logos-fleet` org:

{{BRANCHES}}

Their issues:

{{ISSUES}}

Sub-repo work per issue (from each worktree's manifest):

{{MANIFESTS}}

# SETUP

Run `gh auth setup-git` once so `git push` works over HTTPS. You operate on the HOST's bind-mounted monorepo checkout. If it has uncommitted changes, `git stash` them now and restore them at the end.

**NEVER run builds or test suites in this phase.** Verification happened in the implementer and reviewer sandboxes; your job is update → push → PR → merge.

# PER ISSUE, IN ORDER

## 1. Sub-repo pull requests (from the manifest)

For each listed sub-repo with `pushed: true`, using only the GitHub API (no local checkout of the sub-repo is needed):

- First compare: `gh api repos/<fork>/compare/<base>...<branch> -q .ahead_by`. If `0`, the branch adds nothing over `<base>` (the pin points at commits already on the fork's default branch): there is nothing to land for this sub-repo, treat it as merged and continue.
- `gh pr create --repo <fork> --head <branch> --base <base> --title "<concise title>" --body "Part of logos-fleet/logos-workspace#<issue>. <summary>"`. If a PR already exists for that head, reuse it (`gh pr list --repo <fork> --head <branch>`).
- `gh pr view <n> --repo <fork> --json mergeable -q .mergeable`. If `CONFLICTING`: comment on the monorepo issue naming the sub-repo, do NOT open the monorepo PR for this issue, and continue with the next issue. The next cycle's implementer merges the fork default branch into it.
- Otherwise `gh pr merge <n> --repo <fork> --merge` (sub-repo forks have no required checks; the merge is immediate).

A repo entry with `pushed: false`, or a manifest that lists repos but has `pinned: false`, means the implementer did not finish; comment on the issue and skip the issue entirely. A manifest with `"repos": []` (and therefore `pinned: false`) is complete: no sub-repo commits were needed (a docs-only change, or a gitlink moved to commits already on the forks' default branches), so land the monorepo branch normally.

## 2. Monorepo pull request

Only when every sub-repo PR for the issue merged (or the issue touched no sub-repo):

1. Update the branch WITHOUT rewriting it: `git fetch origin && git checkout <branch> && git merge origin/master`. Never rebase a branch that may already exist on the remote: a rebase followed by `pull --rebase` replays commits that are already on `master` and lands duplicates. `.fleet/manifest.json` must never land: if the branch tracks it, `git rm --cached .fleet/manifest.json` in the merge commit. Resolve merge conflicts by reading both sides; for a gitlink conflict keep the branch's gitlink. No builds. If `flake.nix` or `flake.lock` conflicted, resolve `flake.nix` first, then regenerate the lock with `nix flake lock` (evaluation, not a build) and stage `flake.nix`, `flake.lock` and `nix/dep-graph.nix` only after it has finished; before committing the merge, confirm that every input rev in `flake.nix` matches its `flake.lock` entry.
2. `git push -u origin <branch>`. A merge-based update always fast-forwards the remote branch. If the push is still rejected, `git pull origin <branch>` (plain merge, no `--rebase`) and push again. Never force-push.
3. `gh pr create --repo logos-fleet/logos-workspace --base master --head <branch> --title "<concise title>" --body "..."`. The body must include `Closes #<issue>`, unless the issue carries the label `partial` (`gh issue view <issue> --json labels`): then write `Refs #<issue>` instead, so the issue stays open, and list the acceptance criteria that remain. It also needs a short summary of what was done, which sub-repo PRs landed, and how it was verified (which adapter checks ran).
4. `gh pr view <n> --repo logos-fleet/logos-workspace --json mergeable -q .mergeable`. If `CONFLICTING`, merge `origin/master` into the branch again; if it stays conflicting, comment on the issue and leave the PR open.
5. Merge it: `gh pr merge <n> --repo logos-fleet/logos-workspace --merge`. There is no CI gate on the fork; verification already happened in the implementer and reviewer sandboxes. Never `--watch`, never poll. For a `partial` issue, after the merge remove the label (`gh issue edit <issue> --repo logos-fleet/logos-workspace --remove-label partial`) and comment on the issue with the merged PR and what remains; the next cycle re-plans it.

# AFTER ALL ISSUES

Leave the host checkout as you found it: `git checkout master && git fetch origin && git merge --ff-only origin/master`, then `git stash pop` if you stashed.

Do not add `Co-Authored-By` trailers to any commit. Do not close issues manually. Report per-issue outcomes (sub-repo PRs merged, monorepo PR merged / left open + why).

Once every issue is handled, output <promise>COMPLETE</promise>.
