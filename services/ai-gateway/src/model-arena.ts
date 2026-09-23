import type { RoutingTask } from "./auto-router.js";

export interface ArenaCandidate {
  provider: string;
  model: string;
}

export interface ArenaPlan {
  task: RoutingTask;
  candidates: ArenaCandidate[];
  note: string;
}

export function createArenaPlan(task: RoutingTask, candidates: ArenaCandidate[]): ArenaPlan {
  return {
    task,
    candidates,
    note: "Candidates are presented for comparable evaluation; no universal ranking is assigned."
  };
}
