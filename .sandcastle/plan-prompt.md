# ISSUES

Open issues on the monorepo fork, filtered to those ready for work:

<issues-json>

!`gh issue list --repo logos-fleet/logos-workspace --state open --label fleet-smoke --limit 100 --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

# OPEN FLEET PULL REQUESTS

Sub-repo or monorepo PRs from earlier cycles that have not merged yet. An issue whose
`sandcastle/issue-<N>` PRs are still open here is **blocked**: its monorepo pin cannot
land until they merge, so do not re-plan it this cycle.

<open-prs>

!`gh search prs --owner logos-fleet --state open "head:sandcastle/issue-" --json repository,number,title,url --jq '[.[] | {repo: .repository.nameWithOwner, number, title, url}]'`

</open-prs>

# TASK

Analyze the open issues and build a dependency graph. For each issue, determine whether it **blocks** or **is blocked by** any other open issue.

An issue B is **blocked by** issue A if:

- B requires code or infrastructure that A introduces
- B and A modify overlapping files, modules, or sub-repositories, making concurrent work likely to produce merge conflicts
- B's requirements depend on a decision or API shape that A will establish
- B has open fleet pull requests listed above

An issue is **unblocked** if it has zero blocking dependencies.

For each unblocked issue, assign the branch name `sandcastle/issue-{id}` (no slug or other suffix). This must be deterministic so that re-planning the same issue always produces the same branch name and accumulated progress is preserved.

# OUTPUT

Output your plan as a JSON object wrapped in `<plan>` tags:

<plan>
{"issues": [{"id": "42", "title": "Fix auth bug", "branch": "sandcastle/issue-42"}]}
</plan>

Include only unblocked issues. If every issue is blocked by another open issue (not by open PRs), include the single highest-priority candidate.

Always emit the `<plan>` tags, even when there is nothing to do: `<plan>{"issues": []}</plan>`.
