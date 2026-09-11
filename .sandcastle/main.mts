// Fleet loop: plan → (implement + review per issue, in parallel) → merge.
// Installed by fleet-kit; install-time placeholders are substituted by fleet-init.
//
// Run: npm run sandcastle            (Docker sandboxes)
//      SANDCASTLE_SANDBOX=none npm run sandcastle   (already-isolated host)

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { z } from "zod";
import { readManifest, manifestsToMarkdown, type Manifest } from "./lib/manifest.mts";
import { parseVenue, filterPlanByVenue, environmentVenue } from "./lib/venue.mts";
import { parseLabels, scopeFlags } from "./lib/scope.mts";
import { runPool } from "./lib/pool.mts";
import { execSync } from "node:child_process";

const planSchema = z.object({
  issues: z.array(
    z.object({ id: z.string(), title: z.string(), branch: z.string(), venue: z.enum(["linux", "mac"]) }),
  ),
});

// FLEET_MAX_ITERATIONS=1 for a single-cycle smoke run.
const MAX_ITERATIONS = Number(process.env.FLEET_MAX_ITERATIONS ?? 10);
// Per-role models (installed from fleet.env); FLEET_MODEL_PLANNER etc. override at runtime.
const MODELS = {
  PLANNER: "claude-opus-5",
  IMPLEMENTER: "claude-opus-5",
  REVIEWER: "claude-opus-5",
  MERGER: "claude-opus-5",
} as const;
type Role = keyof typeof MODELS;
const modelFor = (role: Role): string => process.env[`FLEET_MODEL_${role}`] || MODELS[role];
const IMAGE = "logos-workspace-agent:local";
const CLOUD = process.env.SANDCASTLE_SANDBOX === "none";
// FLEET_VENUE=linux|mac selects which labeled issues this loop may plan (spec: venues).
const VENUE = parseVenue(process.env.FLEET_VENUE);
const BASE_BRANCH = "master";
// Branches finished outside the loop (e.g. an implementer resumed with `claude --resume` after a usage limit)
// are adopted: when FLEET_MANIFEST_DIR/<id>.json exists as the issue is planned, its implementer is skipped,
// the branch's commits over the base count as its work and the manifest is restored into the new worktree.
// The file is renamed to <id>.json.adopted so it is used once.
const savedManifest = (id: string): string | null => {
  const dir = process.env.FLEET_MANIFEST_DIR;
  const file = dir ? join(dir, `${id}.json`) : "";
  return file && existsSync(file) ? file : null;
};
const adoptFinishedBranch = (id: string, saved: string, worktreePath: string): { sha: string }[] => {
  mkdirSync(join(worktreePath, ".fleet"), { recursive: true });
  copyFileSync(saved, join(worktreePath, ".fleet", "manifest.json"));
  renameSync(saved, `${saved}.adopted`);
  const shas = execSync(`git rev-list ${BASE_BRANCH}..HEAD`, { cwd: worktreePath, encoding: "utf8" }).split("\n").filter(Boolean);
  console.log(`  ${id}: adopted a branch finished outside the loop (${shas.length} commit(s)); implementer skipped`);
  return shas.map((sha) => ({ sha }));
};
// FLEET_LABELS=a,b (AND) and FLEET_MILESTONE narrow the board at runtime; default is the installed label.
const SCOPE_FLAGS = scopeFlags(parseLabels(process.env.FLEET_LABELS, "fleet-smoke"), process.env.FLEET_MILESTONE);
// FLEET_MAX_PARALLEL caps concurrent issue pipelines (implementer + reviewer); default unlimited.
const MAX_PARALLEL = Number(process.env.FLEET_MAX_PARALLEL ?? Infinity);
// FLEET_IDLE_TIMEOUT: seconds an agent may stay silent (a long nix build inside one Bash call) before
// sandcastle kills it. Must exceed the agent's BASH_MAX_TIMEOUT_MS; sandcastle's default is 600.
const IDLE_TIMEOUT = Number(process.env.FLEET_IDLE_TIMEOUT ?? 4500);

// Plan from the latest base: the merger of another loop may have advanced origin since the last cycle.
const syncHostCheckout = () => {
  try {
    const dirty = execSync("git status --porcelain --untracked-files=no --ignore-submodules", { encoding: "utf8" }).trim();
    if (dirty) {
      console.warn("  ! host checkout has uncommitted changes; skipping base sync");
      return;
    }
    execSync(`git fetch -q origin && git merge -q --ff-only origin/${BASE_BRANCH}`, { stdio: "inherit" });
  } catch (err) {
    console.warn(`  ! base sync failed: ${err instanceof Error ? err.message : String(err)}`);
  }
};

// Adapter-specific persistent mounts (e.g. the Nix store): optional
// .sandcastle/adapter/mounts.json holding [{hostPath, sandboxPath}].
const mounts = existsSync(".sandcastle/adapter/mounts.json")
  ? (JSON.parse(readFileSync(".sandcastle/adapter/mounts.json", "utf8")) as { hostPath: string; sandboxPath: string }[])
  : [];

const makeSandbox = () => (CLOUD ? noSandbox() : docker({ imageName: IMAGE, mounts }));
// On a host venue agents run in Claude Code's "auto" permission mode (classifier-gated), never
// bypassPermissions; the project hooks (.claude/hooks) stay active in either mode.
const makeAgent = (role: Role) =>
  CLOUD
    ? sandcastle.claudeCode(modelFor(role), { permissionMode: "auto" })
    : sandcastle.claudeCode(modelFor(role));
// Runs inside each issue sandbox once, before the implementer.
const sandboxHooks = existsSync(".sandcastle/adapter/bootstrap.sh")
  ? { sandbox: { onSandboxReady: [{ command: "bash .sandcastle/adapter/bootstrap.sh" }] } }
  : undefined;

// Sandbox creation runs one at a time. Every createSandbox prunes "orphaned" worktree directories
// (those `git worktree list` does not show), and a concurrent call can delete a sibling's worktree
// while its `git worktree add` is still registering it: issue #53's pipeline lost its worktree this
// way in the iteration-7 run and never got past "Setting up sandbox".
let sandboxLock: Promise<unknown> = Promise.resolve();
const serialized = <T,>(fn: () => Promise<T>): Promise<T> => {
  const next = sandboxLock.then(fn, fn);
  sandboxLock = next.catch(() => undefined);
  return next;
};

type Outcome = { commits: { sha: string }[]; manifest: Manifest | null };

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} (venue: ${VENUE}, scope: ${SCOPE_FLAGS}) ===`);
  console.log(`models: planner=${modelFor("PLANNER")} implementer=${modelFor("IMPLEMENTER")} reviewer=${modelFor("REVIEWER")} merger=${modelFor("MERGER")}\n`);
  syncHostCheckout();

  const plan = await sandcastle.run({
    sandbox: makeSandbox(),
    name: "planner",
    maxIterations: 1,
    idleTimeoutSeconds: IDLE_TIMEOUT,
    agent: makeAgent("PLANNER"),
    promptFile: "./.sandcastle/plan-prompt.md",
    promptArgs: { VENUE, SCOPE_FLAGS },
    output: sandcastle.Output.object({ tag: "plan", schema: planSchema }),
  });
  const { kept: issues, dropped } = filterPlanByVenue(plan.output.issues, VENUE);
  for (const d of dropped) console.warn(`  ! planner emitted issue ${d.id} for venue ${d.venue}; this loop is ${VENUE}, skipping`);
  if (issues.length === 0) {
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }
  console.log(`Planning complete. ${issues.length} issue(s):`);
  for (const issue of issues) console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);

  const settled = await runPool(issues, MAX_PARALLEL, async (issue): Promise<Outcome> => {
      const sandbox = await serialized(() =>
        sandcastle.createSandbox({
          branch: issue.branch,
          sandbox: makeSandbox(),
          hooks: sandboxHooks,
        }),
      );
      try {
        let commits: { sha: string }[];
        const saved = savedManifest(issue.id);
        if (saved) {
          commits = adoptFinishedBranch(issue.id, saved, sandbox.worktreePath);
        } else {
          const implement = await sandbox.run({
            name: "implementer",
            maxIterations: 100,
            idleTimeoutSeconds: IDLE_TIMEOUT,
            agent: makeAgent("IMPLEMENTER"),
            promptFile: "./.sandcastle/implement-prompt.md",
            promptArgs: { TASK_ID: issue.id, ISSUE_TITLE: issue.title, BRANCH: issue.branch, VENUE: environmentVenue(VENUE) },
          });
          commits = implement.commits;
        }
        if (commits.length > 0) {
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            idleTimeoutSeconds: IDLE_TIMEOUT,
            agent: makeAgent("REVIEWER"),
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
  });

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
    idleTimeoutSeconds: IDLE_TIMEOUT,
    agent: makeAgent("MERGER"),
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
