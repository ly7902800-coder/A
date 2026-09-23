export type BuildStage = "validate" | "install" | "lint" | "test" | "build" | "artifact";

export interface BuildRequest {
  projectId: string;
  target: string;
  stages?: BuildStage[];
}

export interface BuildStepResult {
  stage: BuildStage;
  status: "pending" | "ready";
  message: string;
}

export interface BuildPlan {
  projectId: string;
  target: string;
  steps: BuildStepResult[];
}

const DEFAULT_STAGES: BuildStage[] = ["validate", "install", "lint", "test", "build", "artifact"];

export function createBuildPlan(request: BuildRequest): BuildPlan {
  const stages = request.stages?.length ? request.stages : DEFAULT_STAGES;
  return {
    projectId: request.projectId,
    target: request.target,
    steps: stages.map((stage) => ({
      stage,
      status: "ready",
      message: `Stage ${stage} is defined and ready for a build runner.`
    }))
  };
}
