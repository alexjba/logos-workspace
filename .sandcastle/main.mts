// Fleet loop: plan → (implement + review per issue, in parallel) → merge.
// Installed by fleet-kit; install-time placeholders are substituted by fleet-init.
//
// Run: npm run sandcastle            (Docker sandboxes)
//      SANDCASTLE_SANDBOX=none npm run sandcastle   (already-isolated host)

import { existsSync, readFileSync } from "node:fs";
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { z } from "zod";
import { readManifest, manifestsToMarkdown, type Manifest } from "./lib/manifest.mts";

const planSchema = z.object({
  issues: z.array(z.object({ id: z.string(), title: z.string(), branch: z.string() })),
});

// FLEET_MAX_ITERATIONS=1 for a single-cycle smoke run.
const MAX_ITERATIONS = Number(process.env.FLEET_MAX_ITERATIONS ?? 10);
const MODEL = "claude-fable-5";
const IMAGE = "logos-workspace-agent:local";
const CLOUD = process.env.SANDCASTLE_SANDBOX === "none";

// Adapter-specific persistent mounts (e.g. the Nix store): optional
// .sandcastle/adapter/mounts.json holding [{hostPath, sandboxPath}].
const mounts = existsSync(".sandcastle/adapter/mounts.json")
  ? (JSON.parse(readFileSync(".sandcastle/adapter/mounts.json", "utf8")) as { hostPath: string; sandboxPath: string }[])
  : [];

const makeSandbox = () => (CLOUD ? noSandbox() : docker({ imageName: IMAGE, mounts }));
const makeAgent = () =>
  CLOUD ? sandcastle.claudeCode(MODEL, { permissionMode: "bypassPermissions" }) : sandcastle.claudeCode(MODEL);
// Runs inside each issue sandbox once, before the implementer.
const sandboxHooks = existsSync(".sandcastle/adapter/bootstrap.sh")
  ? { sandbox: { onSandboxReady: [{ command: "bash .sandcastle/adapter/bootstrap.sh" }] } }
  : undefined;

type Outcome = { commits: { sha: string }[]; manifest: Manifest | null };

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  const plan = await sandcastle.run({
    sandbox: makeSandbox(),
    name: "planner",
    maxIterations: 1,
    agent: makeAgent(),
    promptFile: "./.sandcastle/plan-prompt.md",
    output: sandcastle.Output.object({ tag: "plan", schema: planSchema }),
  });
  const issues = plan.output.issues;
  if (issues.length === 0) {
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }
  console.log(`Planning complete. ${issues.length} issue(s):`);
  for (const issue of issues) console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);

  const settled = await Promise.allSettled(
    issues.map(async (issue): Promise<Outcome> => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: makeSandbox(),
        hooks: sandboxHooks,
      });
      try {
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: makeAgent(),
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: { TASK_ID: issue.id, ISSUE_TITLE: issue.title, BRANCH: issue.branch },
        });
        let commits = implement.commits;
        if (commits.length > 0) {
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: makeAgent(),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: { BRANCH: issue.branch },
          });
          commits = [...commits, ...review.commits];
        }
        // Read before close(): the worktree may be torn down.
        const manifest = readManifest(sandbox.worktreePath);
        return { commits, manifest };
      } finally {
        await sandbox.close();
      }
    }),
  );

  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(`  ✗ ${issues[i]!.id} (${issues[i]!.branch}) failed: ${outcome.reason}`);
    }
  }

  const completed = settled.flatMap((outcome, i) =>
    outcome.status === "fulfilled" && outcome.value.commits.length > 0
      ? [{ issue: issues[i]!, manifest: outcome.value.manifest }]
      : [],
  );

  console.log(`\nExecution complete. ${completed.length} branch(es) with commits:`);
  for (const c of completed) {
    const repos = c.manifest ? String(c.manifest.repos.length) : "no manifest";
    console.log(`  ${c.issue.branch} (sub-repos: ${repos})`);
  }
  if (completed.length === 0) {
    console.log("No commits produced. Nothing to merge.");
    continue;
  }

  await sandcastle.run({
    sandbox: makeSandbox(),
    name: "merger",
    maxIterations: 1,
    agent: makeAgent(),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: completed.map((c) => `- ${c.issue.branch}`).join("\n"),
      ISSUES: completed.map((c) => `- ${c.issue.id}: ${c.issue.title}`).join("\n"),
      MANIFESTS: manifestsToMarkdown(
        completed.map((c) => ({ issue: c.issue.id, branch: c.issue.branch, manifest: c.manifest })),
      ),
    },
  });
  console.log("\nMerge phase finished.");
}

console.log("\nAll done.");
