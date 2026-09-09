// Venue routing: which machine a loop runs on and which issues it may plan.
export type Venue = "linux" | "mac";
export const VENUES: readonly Venue[] = ["linux", "mac"];
export const MAC_LABEL = "venue:mac";

export const parseVenue = (env: string | undefined): Venue => {
  if (!env) return "linux";
  if ((VENUES as readonly string[]).includes(env)) return env as Venue;
  throw new Error(`FLEET_VENUE must be one of ${VENUES.join("|")}, got "${env}"`);
};

export const issueVenue = (labels: string[]): Venue => (labels.includes(MAC_LABEL) ? "mac" : "linux");

export const filterPlanByVenue = <T extends { id: string; venue: Venue }>(
  issues: T[],
  venue: Venue,
): { kept: T[]; dropped: T[] } => ({
  kept: issues.filter((i) => i.venue === venue),
  dropped: issues.filter((i) => i.venue !== venue),
});
