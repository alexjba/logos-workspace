import { test } from "node:test";
import assert from "node:assert/strict";
import { runRolling } from "./rolling.mts";

type I = { id: string };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// A board of issues; plan() returns every issue not yet finished, the way a real planner re-offers
// open issues.
const board = (ids: string[]) => {
  const open = new Set(ids);
  return {
    open,
    plan: async (_inFlight: I[]) => [...open].map((id) => ({ id })),
    finish: (id: string) => open.delete(id),
  };
};

test("runRolling starts the next issue as soon as a slot frees, not after the batch", async () => {
  const b = board(["slow", "fast", "next"]);
  const events: string[] = [];
  await runRolling<I>({
    limit: 2,
    budget: 10,
    plan: b.plan,
    run: async ({ id }) => {
      events.push(`start ${id}`);
      await sleep(id === "slow" ? 60 : 5);
      b.finish(id);
      events.push(`end ${id}`);
    },
    onError: () => assert.fail("no errors expected"),
  });
  assert.ok(events.indexOf("start next") < events.indexOf("end slow"), events.join(", "));
});

test("runRolling never runs more than `limit` pipelines at once", async () => {
  const b = board(["a", "b", "c", "d", "e"]);
  let inFlight = 0;
  let peak = 0;
  await runRolling<I>({
    limit: 2,
    budget: 10,
    plan: b.plan,
    run: async ({ id }) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await sleep(5);
      inFlight--;
      b.finish(id);
    },
    onError: () => {},
  });
  assert.equal(peak, 2);
});

test("runRolling re-plans on the timer while a slot is free, without waiting for the running pipeline", async () => {
  const open = new Set(["slow"]);
  const started: string[] = [];
  // "late" appears only after the first plan, the way an issue filed mid-run does.
  setTimeout(() => open.add("late"), 20);
  await runRolling<I>({
    limit: 2,
    budget: 5,
    replanIntervalMs: 10,
    plan: async () => [...open].map((id) => ({ id })),
    run: async ({ id }) => {
      started.push(id);
      await sleep(id === "slow" ? 200 : 5);
      open.delete(id);
    },
    onError: () => assert.fail("no errors expected"),
  });
  assert.deepEqual(started, ["slow", "late"]);
});

test("without an interval, a mid-run issue waits for a pipeline to finish", async () => {
  const open = new Set(["slow"]);
  const order: string[] = [];
  setTimeout(() => open.add("late"), 20);
  await runRolling<I>({
    limit: 2,
    budget: 5,
    plan: async () => [...open].map((id) => ({ id })),
    run: async ({ id }) => {
      order.push(`start ${id}`);
      await sleep(id === "slow" ? 60 : 5);
      open.delete(id);
      order.push(`end ${id}`);
    },
    onError: () => {},
  });
  assert.ok(order.indexOf("start late") > order.indexOf("end slow"), order.join(", "));
});

test("runRolling stops when a plan starts nothing and nothing is in flight", async () => {
  const r = await runRolling<I>({
    limit: 4,
    budget: 10,
    plan: async () => [],
    run: async () => assert.fail("nothing to run"),
    onError: () => {},
  });
  assert.deepEqual(r, { started: 0, rounds: 1 });
});

test("runRolling hands the planner what is in flight and ignores in-flight ids it returns again", async () => {
  const seen: string[][] = [];
  const b = board(["a", "b"]);
  const runs: string[] = [];
  await runRolling<I>({
    limit: 2,
    budget: 10,
    plan: async (inFlight) => {
      seen.push(inFlight.map((i) => i.id));
      return b.plan(inFlight);
    },
    run: async ({ id }) => {
      runs.push(id);
      await sleep(id === "a" ? 30 : 5);
      b.finish(id);
    },
    onError: () => {},
  });
  assert.deepEqual(runs.sort(), ["a", "b"]);
  assert.deepEqual(seen[1], ["a"], "after b finishes, the planner is told a is still running");
});

test("runRolling stops starting pipelines once the budget is spent", async () => {
  let n = 0;
  const r = await runRolling<I>({
    limit: 2,
    budget: 3,
    plan: async () => [{ id: `i${n++}` }, { id: `i${n++}` }],
    run: async () => sleep(2),
    onError: () => {},
  });
  assert.equal(r.started, 3);
});

test("a failed pipeline frees its slot, is reported, and is not planned again", async () => {
  const b = board(["bad", "good"]);
  const errors: string[] = [];
  const runs: string[] = [];
  await runRolling<I>({
    limit: 1,
    budget: 10,
    plan: b.plan,
    run: async ({ id }) => {
      runs.push(id);
      if (id === "bad") throw new Error("boom");
      b.finish(id);
    },
    onError: (issue, reason) => errors.push(`${issue.id}: ${(reason as Error).message}`),
  });
  assert.deepEqual(errors, ["bad: boom"]);
  assert.deepEqual(runs, ["bad", "good"]);
});
