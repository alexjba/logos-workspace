import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLabels, scopeFlags } from "./scope.mts";

test("parseLabels falls back and splits on commas", () => {
  assert.deepEqual(parseLabels(undefined, "fleet-smoke"), ["fleet-smoke"]);
  assert.deepEqual(parseLabels("  ", "fleet-smoke"), ["fleet-smoke"]);
  assert.deepEqual(parseLabels("ready-for-agent, milestone-1,", "x"), ["ready-for-agent", "milestone-1"]);
});

test("scopeFlags builds AND label flags and an optional milestone, shell-quoted", () => {
  assert.equal(scopeFlags(["a", "b"]), "--label 'a' --label 'b'");
  assert.equal(scopeFlags(["a"], "Milestone 1"), "--label 'a' --milestone 'Milestone 1'");
  assert.equal(scopeFlags(["it's"]), "--label 'it'\\''s'");
});
