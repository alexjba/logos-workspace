// Venue routing: which machine a loop runs on and which issues it may plan.
// "all" = one machine covers both venues (a Mac): plans everything, uses the mac environment and guard.
export type Venue = "linux" | "mac" | "all";
export const VENUES: readonly Venue[] = ["linux", "mac", "all"];
export const MAC_LABEL = "venue:mac";

export const parseVenue = (env: string | undefined): Venue => {
  if (!env) return "linux";
  if ((VENUES as readonly string[]).includes(env)) return env as Venue;
  throw new Error(`FLEET_VENUE must be one of ${VENUES.join("|")}, got "${env}"`);
};

export const issueVenue = (labels: string[]): Exclude<Venue, "all"> => (labels.includes(MAC_LABEL) ? "mac" : "linux");

/** Environment file the implementer gets: "all" runs on a Mac. */
export const environmentVenue = (venue: Venue): Exclude<Venue, "all"> => (venue === "all" ? "mac" : venue);

export const filterPlanByVenue = <T extends { id: string; venue: string }>(
  issues: T[],
  venue: Venue,
): { kept: T[]; dropped: T[] } =>
  venue === "all"
    ? { kept: issues, dropped: [] }
    : { kept: issues.filter((i) => i.venue === venue), dropped: issues.filter((i) => i.venue !== venue) };
