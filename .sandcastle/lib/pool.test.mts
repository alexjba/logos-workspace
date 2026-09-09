import { test } from "node:test";
import assert from "node:assert/strict";
import { runPool } from "./pool.mts";

test("runPool caps concurrency and preserves order", async () => {
  let inFlight = 0, peak = 0;
  const r = await runPool([1, 2, 3, 4, 5], 2, async (n) => {
    inFlight++; peak = Math.max(peak, inFlight);
    await new Promise((res) => setTimeout(res, 5));
    inFlight--;
    if (n === 3) throw new Error("boom");
    return n * 10;
  });
  assert.equal(peak, 2);
  assert.deepEqual(r.map((x) => x.status), ["fulfilled", "fulfilled", "rejected", "fulfilled", "fulfilled"]);
  assert.equal((r[4] as PromiseFulfilledResult<number>).value, 50);
});

test("runPool with Infinity runs everything at once", async () => {
  let peak = 0, inFlight = 0;
  await runPool([1, 2, 3], Infinity, async () => { inFlight++; peak = Math.max(peak, inFlight); await new Promise((r) => setTimeout(r, 5)); inFlight--; });
  assert.equal(peak, 3);
});
