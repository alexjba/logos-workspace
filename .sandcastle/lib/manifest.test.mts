import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readManifest, manifestsToMarkdown } from "./manifest.mts";

const worktreeWith = (content: string | null) => {
  const dir = mkdtempSync(join(tmpdir(), "fleet-"));
  if (content !== null) {
    mkdirSync(join(dir, ".fleet"));
    writeFileSync(join(dir, ".fleet", "manifest.json"), content);
  }
  return dir;
};

test("missing manifest is null", () => {
  assert.equal(readManifest(worktreeWith(null)), null);
});

test("invalid manifest is null", () => {
  assert.equal(readManifest(worktreeWith("{not json")), null);
  assert.equal(readManifest(worktreeWith('{"issue":"1"}')), null);
});

test("valid manifest round-trips", () => {
  const m = readManifest(
    worktreeWith(
      JSON.stringify({
        issue: "42",
        branch: "sandcastle/issue-42",
        repos: [{ path: "repos/libone", fork: "acme-fleet/libone", branch: "sandcastle/issue-42", base: "master", pushed: true }],
        pinned: true,
      }),
    ),
  );
  assert.deepEqual(m?.repos[0], { path: "repos/libone", fork: "acme-fleet/libone", branch: "sandcastle/issue-42", base: "master", pushed: true });
  assert.equal(m?.pinned, true);
});

test("markdown lists repos and flags missing manifests", () => {
  const md = manifestsToMarkdown([
    {
      issue: "42",
      branch: "sandcastle/issue-42",
      manifest: {
        issue: "42",
        branch: "sandcastle/issue-42",
        repos: [{ path: "repos/libone", fork: "acme-fleet/libone", branch: "sandcastle/issue-42", base: "master", pushed: true }],
        pinned: true,
      },
    },
    { issue: "43", branch: "sandcastle/issue-43", manifest: null },
  ]);
  assert.match(md, /- issue 42 \(sandcastle\/issue-42\): pinned=true/);
  assert.match(md, /  - repos\/libone: fork acme-fleet\/libone branch sandcastle\/issue-42 base master pushed=true/);
  assert.match(md, /- issue 43 \(sandcastle\/issue-43\): NO MANIFEST/);
});
