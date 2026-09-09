// Issue scope selector: FLEET_LABELS (comma-separated, AND) and FLEET_MILESTONE become gh flags.
const shellQuote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

export const parseLabels = (env: string | undefined, fallback: string): string[] => {
  const raw = env && env.trim() ? env : fallback;
  return raw
    .split(",")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
};

/** e.g. `--label 'ready-for-agent' --label 'milestone-1' --milestone 'Milestone 1'` */
export const scopeFlags = (labels: string[], milestone?: string): string => {
  const parts = labels.map((l) => `--label ${shellQuote(l)}`);
  if (milestone && milestone.trim()) parts.push(`--milestone ${shellQuote(milestone.trim())}`);
  return parts.join(" ");
};
