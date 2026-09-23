export type FeatureStatus = "core" | "adapter" | "planned";
export type FeatureCategory =
  | "ai"
  | "engineering"
  | "build"
  | "game"
  | "3d"
  | "devops";

export interface GenesisFeature {
  id: string;
  name: string;
  category: FeatureCategory;
  status: FeatureStatus;
  description: string;
  requires: string[];
}

export const GENESIS_FEATURES: GenesisFeature[] = [
  { id: "auto-model-router", name: "Auto Model Router", category: "ai", status: "core", description: "Routes requests using explicit task capabilities, provider availability and fallback rules.", requires: ["provider-catalog"] },
  { id: "model-arena", name: "Model Arena", category: "ai", status: "planned", description: "Runs comparable model tasks and records results without imposing a universal ranking.", requires: ["model-router", "evaluation-store"] },
  { id: "long-term-memory", name: "Long-Term Memory", category: "ai", status: "planned", description: "Persistent user-approved memories with retrieval and deletion controls.", requires: ["database", "auth"] },
  { id: "context-engine", name: "AI Context Engine", category: "ai", status: "core", description: "Combines conversation, project and tool context into agent inputs.", requires: ["agents"] },
  { id: "multi-agent-teams", name: "Multi-Agent Teams", category: "ai", status: "core", description: "Coordinates planner, coder, researcher and reviewer roles.", requires: ["agents", "orchestrator"] },
  { id: "codebase-engineer", name: "AI Codebase Engineer", category: "engineering", status: "adapter", description: "Reads, plans and proposes repository changes through repository adapters.", requires: ["github-adapter", "approvals"] },
  { id: "bug-hunter", name: "Automatic Bug Hunter", category: "engineering", status: "planned", description: "Scans build output, tests and diagnostics for actionable defects.", requires: ["build-pipeline", "test-runner"] },
  { id: "code-review", name: "AI Code Review", category: "engineering", status: "core", description: "Provides structured review findings and suggested fixes.", requires: ["agents"] },
  { id: "cloud-ide", name: "Cloud IDE", category: "engineering", status: "planned", description: "Browser-based editor, terminal, preview and project workspace.", requires: ["workspace-service", "build-pipeline"] },
  { id: "one-click-build", name: "One-Click Build Pipeline", category: "build", status: "planned", description: "Standardizes validate, test, build and artifact stages.", requires: ["build-runner", "artifact-store"] },
  { id: "ai-game-builder", name: "AI Game Builder", category: "game", status: "adapter", description: "Turns a game specification into an engine/platform plan and project tasks.", requires: ["platform-orchestrator", "codebase-engineer"] },
  { id: "game-design-copilot", name: "Game Design Copilot", category: "game", status: "planned", description: "Maintains mechanics, progression, economy and content specifications.", requires: ["context-engine"] },
  { id: "level-generator", name: "AI Level Generator", category: "game", status: "planned", description: "Generates structured level specifications and validation constraints.", requires: ["game-design-copilot"] },
  { id: "game-qa-agent", name: "Game QA Agent", category: "game", status: "planned", description: "Creates and evaluates gameplay test scenarios and build diagnostics.", requires: ["build-pipeline", "bug-hunter"] },
  { id: "multiplayer-architecture", name: "Multiplayer Architecture Generator", category: "game", status: "planned", description: "Produces server, realtime, state-sync and authority architecture plans.", requires: ["platform-orchestrator"] },
  { id: "3d-asset-pipeline", name: "3D Asset Pipeline", category: "3d", status: "planned", description: "Coordinates modeling, materials, animation and export stages.", requires: ["3d-platforms"] },
  { id: "scene-builder", name: "Scene Builder", category: "3d", status: "planned", description: "Creates structured scene graphs, lighting and environment specifications.", requires: ["3d-asset-pipeline"] },
  { id: "animation-assistant", name: "Animation Assistant", category: "3d", status: "planned", description: "Plans rigging, animation states and transition graphs.", requires: ["3d-asset-pipeline"] },
  { id: "universal-project-exporter", name: "Universal Project Exporter", category: "build", status: "planned", description: "Maps project specifications to supported engine and deployment targets.", requires: ["platform-orchestrator", "build-pipeline"] },
  { id: "ai-devops-center", name: "AI DevOps Center", category: "devops", status: "planned", description: "Centralizes builds, logs, deployments, artifacts and approval-gated releases.", requires: ["build-pipeline", "approvals"] }
];

export function listGenesisFeatures(status?: FeatureStatus) {
  return GENESIS_FEATURES.filter((feature) => !status || feature.status === status);
}

export function getGenesisFeature(id: string) {
  return GENESIS_FEATURES.find((feature) => feature.id === id);
}
