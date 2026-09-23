export interface AnimationPlan {
  states: string[];
  transitions: Array<{ from: string; to: string; condition: string }>;
}

export function createAnimationPlan(): AnimationPlan {
  return {
    states: ["idle", "move", "action", "hit", "defeat"],
    transitions: [
      { from: "idle", to: "move", condition: "movement input" },
      { from: "move", to: "idle", condition: "movement stopped" },
      { from: "move", to: "action", condition: "action requested" }
    ]
  };
}
