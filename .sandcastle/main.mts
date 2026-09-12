// Fleet loop: keep up to FLEET_MAX_PARALLEL issue pipelines (implement → review → merge) in flight,
// planning again whenever one finishes.
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
import { runRolling } from "./lib/rolling.mts";
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
// FLEET_MAX_PARALLEL caps concurrent issue pipelines (implementer + reviewer + merge); default unlimited.
const MAX_PARALLEL = Number(process.env.FLEET_MAX_PARALLEL ?? Infinity);
// FLEET_MAX_PIPELINES caps how many issue pipelines a run starts in total; by default as many as
// the old batch loop could (FLEET_MAX_ITERATIONS batches of FLEET_MAX_PARALLEL issues).
const MAX_PIPELINES = Number(
  process.env.FLEET_MAX_PIPELINES ?? MAX_ITERATIONS * (Number.isFinite(MAX_PARALLEL) ? MAX_PARALLEL : 4),
);
// FLEET_REPLAN_INTERVAL (seconds) re-plans on a timer while a slot is free, so an issue filed
// mid-run does not wait for the next pipeline to finish. 0 disables it.
const REPLAN_INTERVAL_MS = Number(process.env.FLEET_REPLAN_INTERVAL ?? 600) * 1000;
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

// A lock runs its callers one at a time, in call order.
const makeLock = () => {
  let tail: Promise<unknown> = Promise.resolve();
  return <T,>(fn: () => Promise<T>): Promise<T> => {
    const next = tail.then(fn, fn);
    tail = next.catch(() => undefined);
    return next;
  };
};
// Sandbox creation runs one at a time. Every createSandbox prunes "orphaned" worktree directories
// (those `git worktree list` does not show), and a concurrent call can delete a sibling's worktree
// while its `git worktree add` is still registering it: issue #53's pipeline lost its worktree this
// way in the iteration-7 run and never got past "Setting up sandbox".
const withSandboxLock = makeLock();
// Planning and merging share the host checkout: the merger stashes, checks out and fast-forwards
// it, and a plan made mid-merge would read a half-landed base. They take turns.
const withHostLock = makeLock();

type Issue = z.infer<typeof planSchema>["issues"][number];
type Outcome = { commits: { sha: string }[]; manifest: Manifest | null };

const describeInFlight = (issues: Issue[]): string =>
  issues.length ? issues.map((i) => `- #${i.id}: ${i.title} (${i.branch})`).join("\n") : "(none)";

let round = 0;
const plan = (inFlight: Issue[]): Promise<Issue[]> =>
  withHostLock(async () => {
    round++;
    const busy = inFlight.map((i) => `#${i.id}`).join(" ") || "none";
    console.log(`\n=== Plan round ${round} (venue: ${VENUE}, scope: ${SCOPE_FLAGS}, in flight: ${busy}) ===`);
    console.log(`models: planner=${modelFor("PLANNER")} implementer=${modelFor("IMPLEMENTER")} reviewer=${modelFor("REVIEWER")} merger=${modelFor("MERGER")}\n`);
    syncHostCheckout();
    const result = await sandcastle.run({
      sandbox: makeSandbox(),
      name: "planner",
      maxIterations: 1,
      idleTimeoutSeconds: IDLE_TIMEOUT,
      agent: makeAgent("PLANNER"),
      promptFile: "./.sandcastle/plan-prompt.md",
      promptArgs: { VENUE, SCOPE_FLAGS, IN_FLIGHT: describeInFlight(inFlight) },
      output: sandcastle.Output.object({ tag: "plan", schema: planSchema }),
    });
    const { kept, dropped } = filterPlanByVenue(result.output.issues, VENUE);
    for (const d of dropped) console.warn(`  ! planner emitted issue ${d.id} for venue ${d.venue}; this loop is ${VENUE}, skipping`);
    const fresh = kept.filter((i) => !inFlight.some((f) => f.id === i.id));
    console.log(`Planning complete. ${fresh.length} candidate(s):`);
    for (const issue of fresh) console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
    return fresh;
  });

const implementAndReview = async (issue: Issue): Promise<Outcome> => {
  const sandbox = await withSandboxLock(() =>
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
    return { commits, manifest: readManifest(sandbox.worktreePath) };
  } finally {
    await sandbox.close();
  }
};

const merge = (issue: Issue, manifest: Manifest | null) =>
  withHostLock(() =>
    sandcastle.run({
      sandbox: makeSandbox(),
      name: "merger",
      maxIterations: 1,
      idleTimeoutSeconds: IDLE_TIMEOUT,
      agent: makeAgent("MERGER"),
      promptFile: "./.sandcastle/merge-prompt.md",
      promptArgs: {
        BRANCHES: `- ${issue.branch}`,
        ISSUES: `- ${issue.id}: ${issue.title}`,
        MANIFESTS: manifestsToMarkdown([{ issue: issue.id, branch: issue.branch, manifest }]),
      },
    }),
  );

// One issue end to end: implement and review in its own sandbox, then land it as soon as it is done.
const runIssue = async (issue: Issue): Promise<void> => {
  console.log(`  → starting #${issue.id} (${issue.branch})`);
  const { commits, manifest } = await implementAndReview(issue);
  if (commits.length === 0) {
    console.log(`\n${issue.branch}: no commits produced; nothing to merge.`);
    return;
  }
  console.log(`\nExecution complete for ${issue.branch} (sub-repos: ${manifest ? manifest.repos.length : "no manifest"}).`);
  await merge(issue, manifest);
  console.log(`\nMerge phase finished (${issue.branch}).`);
};

const { started, rounds } = await runRolling<Issue>({
  limit: MAX_PARALLEL,
  budget: MAX_PIPELINES,
  replanIntervalMs: REPLAN_INTERVAL_MS,
  plan,
  run: runIssue,
  onError: (issue, reason) => console.error(`  ✗ ${issue.id} (${issue.branch}) failed: ${reason}`),
});

console.log(`\nAll done: ${started} pipeline(s) over ${rounds} plan round(s).`);
