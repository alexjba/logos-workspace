// Rolling scheduler: keep up to `limit` issue pipelines in flight and plan again as soon as one
// finishes. The earlier plan → run the whole batch → merge cycle left a finished issue's slot idle
// until the slowest issue of its batch had been reviewed and merged (3.5 h for #57 on 2026-09-11).
//
// plan(inFlight) returns candidate issues; ids already in flight are ignored, and so are ids whose
// pipeline failed earlier in this run (re-planning them would repeat the failure). run(issue) is one
// issue's whole pipeline; a rejection is reported through onError and frees the slot like a success.
// After a plan that starts nothing, the next plan waits for a pipeline to finish.
//
// Stops when a plan starts nothing and nothing is in flight, or once `budget` pipelines have
// started and all of them have finished.
export type Plannable = { id: string };

export const runRolling = async <I extends Plannable>(opts: {
  limit: number;
  budget: number;
  plan: (inFlight: I[]) => Promise<I[]>;
  run: (issue: I) => Promise<void>;
  onError: (issue: I, reason: unknown) => void;
}): Promise<{ started: number; rounds: number }> => {
  const { limit, budget, plan, run, onError } = opts;
  const inFlight = new Map<string, { issue: I; done: Promise<void> }>();
  const failed = new Set<string>();
  let started = 0;
  let rounds = 0;
  for (;;) {
    const room = Math.min(limit - inFlight.size, budget - started);
    if (room > 0) {
      rounds++;
      const candidates = await plan([...inFlight.values()].map((f) => f.issue));
      let startedNow = 0;
      for (const issue of candidates) {
        if (startedNow === room) break;
        if (inFlight.has(issue.id) || failed.has(issue.id)) continue;
        started++;
        startedNow++;
        const done = run(issue)
          .catch((reason) => {
            failed.add(issue.id);
            onError(issue, reason);
          })
          .finally(() => {
            inFlight.delete(issue.id);
          });
        inFlight.set(issue.id, { issue, done });
      }
    }
    if (inFlight.size === 0) break;
    await Promise.race([...inFlight.values()].map((f) => f.done));
  }
  return { started, rounds };
};
