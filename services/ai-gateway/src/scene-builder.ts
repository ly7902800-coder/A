export interface ScenePlan {
  nodes: string[];
  lighting: string[];
  environments: string[];
}

export function createScenePlan(): ScenePlan {
  return {
    nodes: ["root", "camera", "lights", "environment", "actors"],
    lighting: ["key", "fill", "environment"],
    environments: ["sky", "terrain", "props", "navigation"]
  };
}
