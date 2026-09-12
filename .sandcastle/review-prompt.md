# TASK

Review the code changes on branch `{{BRANCH}}` and improve code clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

Diffs below are capped in size and exclude generated files (`flake.lock`, `nix/dep-graph.nix`,
which appear as `--stat` only). Where a diff is cut off, run `git diff` yourself for the rest.

## Monorepo diff

!`git diff --stat {{TARGET_BRANCH}}...{{BRANCH}}`

!`git diff {{TARGET_BRANCH}}...{{BRANCH}} -- . ':(exclude)flake.lock' ':(exclude)nix/dep-graph.nix' | head -c 40000`

## Monorepo commits

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

## Sub-repo diffs (from .fleet/manifest.json)

!`for p in $(jq -r '.repos[].path' .fleet/manifest.json 2>/dev/null); do b=$(jq -r ".repos[] | select(.path==\"$p\") | .base" .fleet/manifest.json); echo "### $p (base origin/$b)"; git -C "$p" fetch -q origin "$b" 2>/dev/null; git -C "$p" diff --stat "origin/$b...HEAD"; git -C "$p" diff "origin/$b...HEAD" -- . ':(exclude)flake.lock' | head -c 25000; done`

# REVIEW PROCESS

1. **Understand the change**: read the diffs and commits above to understand the intent.
2. **Analyze for improvements**: reduce unnecessary complexity and nesting; eliminate redundant code; clear names; consolidate related logic; remove comments that describe obvious code; no nested ternaries; clarity over brevity.
3. **Check correctness**: does the implementation match the intent, are edge cases handled, are new behaviours covered by tests, any unchecked assumptions, injection or credential leaks?
4. **Maintain balance**: do not over-simplify into clever or tangled code; keep helpful abstractions.
5. **Apply project standards**: @.sandcastle/CODING_STANDARDS.md
6. **Preserve functionality**: never change what the code does, only how.

# VERIFICATION

Re-running every check is the most expensive part of a review (often most of it), so do it only when it can change the verdict:

- **You changed code** (any commit, in the monorepo or a sub-repo): run `.sandcastle/adapter/verify.sh <repo...>` for the sub-repos you touched, after your last commit, and base your verdict on that run. Re-pin first (`pin.sh <repo>` + commit) when the change is in a sub-repo: otherwise the run tests the old pin, and for `logos-basecamp` a path override fails four of its own checks regardless of content.
- **You changed nothing**: check the implementer's verification instead of repeating it. It is enough when the issue comment names the `verify.sh` run, that run was against the branch's current sub-repo commits (compare with `git -C repos/<x> rev-parse --short HEAD`), its log exists and ends in the results it reports, and every FAIL it calls pre-existing is backed by a run from the unmodified pin. If any of that is missing, stale or doubtful, run `verify.sh` yourself for the affected repos.

Keep your own files in a private directory (`T=$(mktemp -d /tmp/review-XXXXXX)`), never fixed names under `/tmp`: several issues run on this machine at once, and a shared file mixes their results.

# EXECUTION

If you find improvements to make:

1. Make the changes directly on the branch, in the monorepo or in the sub-repo where the code lives.
2. Re-run the adapter verification for touched sub-repos: `.sandcastle/adapter/verify.sh <repo...>`.
3. Commit. For sub-repo commits, push: `git -C repos/<x> push origin {{BRANCH}}`, then re-pin in the monorepo with `.sandcastle/adapter/pin.sh <repo...>` and commit that too.

Source `.sandcastle/adapter/env.sh` before any `ws` command. It sets `FLEET_ORG=logos-fleet`; without it `ws sync-graph` rewrites every `flake.nix` URL to `github:logos-co/*`. Never commit a `flake.nix` that contains `github:logos-co/`.

If the branch tracks `.fleet/manifest.json` (`git ls-files .fleet`), untrack it (`git rm --cached .fleet/manifest.json`, keep the file) and commit: it is loop state and must never reach master.

If the code is already clean and well-structured, do nothing.

# HEADLESS SESSION

You run non-interactively: the session ends the moment you end your turn, and nothing resumes it.
Never end a turn to "wait for a background task" or "be notified"; nothing will notify you, and
uncommitted edits are discarded. Do not use `run_in_background`; a Bash call may run for up to
60 minutes (`timeout` in ms, max 3600000). Every verification, commit, push and re-pin must finish
inside your turn, before the completion promise below.

Do not add `Co-Authored-By` trailers to commits.

Once complete, output <promise>COMPLETE</promise>.
