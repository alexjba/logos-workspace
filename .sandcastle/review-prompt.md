# TASK

Review the code changes on branch `{{BRANCH}}` and improve code clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

## Monorepo diff

!`git diff {{TARGET_BRANCH}}...{{BRANCH}}`

## Monorepo commits

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

## Sub-repo diffs (from .fleet/manifest.json)

!`for p in $(jq -r '.repos[].path' .fleet/manifest.json 2>/dev/null); do b=$(jq -r ".repos[] | select(.path==\"$p\") | .base" .fleet/manifest.json); echo "### $p (base origin/$b)"; git -C "$p" fetch -q origin "$b" 2>/dev/null; git -C "$p" diff "origin/$b...HEAD"; done`

# REVIEW PROCESS

1. **Understand the change**: read the diffs and commits above to understand the intent.
2. **Analyze for improvements**: reduce unnecessary complexity and nesting; eliminate redundant code; clear names; consolidate related logic; remove comments that describe obvious code; no nested ternaries; clarity over brevity.
3. **Check correctness**: does the implementation match the intent, are edge cases handled, are new behaviours covered by tests, any unchecked assumptions, injection or credential leaks?
4. **Maintain balance**: do not over-simplify into clever or tangled code; keep helpful abstractions.
5. **Apply project standards**: @.sandcastle/CODING_STANDARDS.md
6. **Preserve functionality**: never change what the code does, only how.

# EXECUTION

If you find improvements to make:

1. Make the changes directly on the branch, in the monorepo or in the sub-repo where the code lives.
2. Re-run the adapter verification for touched sub-repos: `.sandcastle/adapter/verify.sh <repo...>`.
3. Commit. For sub-repo commits, push: `git -C repos/<x> push origin {{BRANCH}}`, then re-pin in the monorepo with `.sandcastle/adapter/pin.sh <repo...>` and commit that too.

If the code is already clean and well-structured, do nothing.

Once complete, output <promise>COMPLETE</promise>.
