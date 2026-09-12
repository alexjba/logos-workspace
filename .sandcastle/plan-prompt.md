# ISSUES

Open issues on the monorepo fork, filtered to those ready for work:

<issues-json>

!`gh issue list --repo logos-fleet/logos-workspace --state open {{SCOPE_FLAGS}} --limit 100 --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

# OPEN FLEET PULL REQUESTS

Sub-repo or monorepo PRs from earlier cycles that have not merged yet. An issue whose
`sandcastle/issue-<N>` PRs are still open here is **blocked**: its monorepo pin cannot
land until they merge, so do not re-plan it this cycle.

**Exception:** if the merger's latest comment on the issue says landing is blocked by a
`CONFLICTING` sub-repo PR, the open PR does not block the issue. Plan it: the implementer's
job that cycle is to merge the fork's default branch into the sub-repo branch, resolve the
conflict, re-verify and push, so the PR becomes mergeable.

<open-prs>

!`gh search prs --owner logos-fleet --state open "head:sandcastle/issue-" --json repository,number,title,url --jq '[.[] | {repo: .repository.nameWithOwner, number, title, url}]'`

</open-prs>

# IN FLIGHT

Issues an agent of this loop is working on right now:

{{IN_FLIGHT}}

Never plan an issue listed here. Count each one as open work for the blocking rules below: an issue that would edit the same files or subsystem as an in-flight issue is blocked until that one lands. The loop plans again every time a pipeline finishes, so an issue held now is reconsidered soon.

# VENUE

This loop runs on venue **{{VENUE}}**. An issue's venue is `mac` if and only if it carries the label `venue:mac`; every other issue is `linux`. Never infer `mac` from the issue text. Emit each issue's venue (`linux` or `mac`) in its planned entry.

- If this venue is `linux` or `mac`: plan ONLY issues whose venue equals it; issues for the other venue are handled by another loop and must not appear in your plan at all (not even as blocked).
- If this venue is `all`: one machine covers both venues; plan every unblocked issue regardless of its venue label.

# TASK

Analyze the open issues and build a dependency graph. For each issue, determine whether it **blocks** or **is blocked by** any other open issue.

**Explicit dependencies are authoritative.** If an issue body has a "Blocked by" section (or GitHub's native blocked-by relation) naming other issues (`#N`), the issue is blocked while any of them is still open. The heuristics below only add blocks for overlaps the author did not list; they never remove an explicit one.

An issue B is also **blocked by** issue A if:

- B requires code or infrastructure that A introduces
- B and A modify overlapping files or modules, making concurrent work likely to produce merge conflicts. Touching the same shared-infrastructure sub-repo (`logos-nix`, `logos-module-builder`, `logos-liblogos`) is NOT on its own an overlap: nearly every slice touches them, and the merger resolves lock-only conflicts itself. Hold B only when both issues will clearly edit the same files or the same subsystem inside such a repo; a source conflict costs at most one cycle, while holding the head of a long dependency chain costs a full cycle for every issue behind it.
- B's requirements depend on a decision or API shape that A will establish
- B has open fleet pull requests listed above

An issue is **unblocked** if it has zero blocking dependencies.

For each unblocked issue, assign the branch name `sandcastle/issue-{id}` (no slug or other suffix). This must be deterministic so that re-planning the same issue always produces the same branch name and accumulated progress is preserved.

# OUTPUT

Output your plan as a JSON object wrapped in `<plan>` tags:

<plan>
{"issues": [{"id": "42", "title": "Fix auth bug", "branch": "sandcastle/issue-42", "venue": "{{VENUE}}"}]}
</plan>

Include only unblocked issues. If every issue is blocked by another open issue (not by open PRs) and nothing is in flight, include the single highest-priority candidate; while anything is in flight, an empty plan is fine.

Always emit the `<plan>` tags, even when there is nothing to do: `<plan>{"issues": []}</plan>`.
