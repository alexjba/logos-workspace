// .fleet/manifest.json contract between the implementer and the merger.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const manifestSchema = z.object({
  issue: z.string(),
  branch: z.string(),
  repos: z.array(
    z.object({
      path: z.string(),
      fork: z.string(),
      branch: z.string(),
      base: z.string(),
      pushed: z.boolean(),
    }),
  ),
  pinned: z.boolean(),
});

export type Manifest = z.infer<typeof manifestSchema>;
export type ManifestRepo = Manifest["repos"][number];

export const readManifest = (worktreePath: string): Manifest | null => {
  const file = join(worktreePath, ".fleet", "manifest.json");
  if (!existsSync(file)) return null;
  try {
    return manifestSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  } catch (err) {
    console.error(`invalid manifest at ${file}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
};

export const manifestsToMarkdown = (
  entries: { issue: string; branch: string; manifest: Manifest | null }[],
): string =>
  entries
    .map(({ issue, branch, manifest }) => {
      if (!manifest) return `- issue ${issue} (${branch}): NO MANIFEST`;
      const repos = manifest.repos.map(
        (r) => `  - ${r.path}: fork ${r.fork} branch ${r.branch} base ${r.base} pushed=${r.pushed}`,
      );
      return [`- issue ${issue} (${branch}): pinned=${manifest.pinned}`, ...repos].join("\n");
    })
    .join("\n");
