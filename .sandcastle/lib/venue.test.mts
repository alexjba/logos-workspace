import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVenue, issueVenue, filterPlanByVenue, environmentVenue } from "./venue.mts";

test("parseVenue defaults to linux and rejects unknown", () => {
  assert.equal(parseVenue(undefined), "linux");
  assert.equal(parseVenue(""), "linux");
  assert.equal(parseVenue("mac"), "mac");
  assert.throws(() => parseVenue("windows"), /FLEET_VENUE/);
});

test("issueVenue is mac only with the venue:mac label", () => {
  assert.equal(issueVenue([]), "linux");
  assert.equal(issueVenue(["ready-for-agent"]), "linux");
  assert.equal(issueVenue(["venue:mac", "fleet-smoke"]), "mac");
  assert.equal(issueVenue(["venue:linux"]), "linux");
});

test("filterPlanByVenue splits kept and dropped", () => {
  const issues = [
    { id: "1", venue: "linux" as const },
    { id: "2", venue: "mac" as const },
    { id: "3", venue: "linux" as const },
  ];
  const r = filterPlanByVenue(issues, "linux");
  assert.deepEqual(r.kept.map((i) => i.id), ["1", "3"]);
  assert.deepEqual(r.dropped.map((i) => i.id), ["2"]);
  assert.deepEqual(filterPlanByVenue(issues, "mac").kept.map((i) => i.id), ["2"]);
});

test("all venue keeps everything and maps to the mac environment", () => {
  assert.equal(parseVenue("all"), "all");
  const issues = [{ id: "1", venue: "linux" }, { id: "2", venue: "mac" }];
  assert.deepEqual(filterPlanByVenue(issues, "all").kept.map((i) => i.id), ["1", "2"]);
  assert.equal(environmentVenue("all"), "mac");
  assert.equal(environmentVenue("linux"), "linux");
});
