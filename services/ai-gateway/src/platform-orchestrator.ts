import type { PlatformCategory, CreativePlatform } from "./creative-platforms.js";
import { listCreativePlatforms } from "./creative-platforms.js";

export interface ProjectIntent {
  kind: "game" | "3d" | "web" | "mobile" | "backend" | "xr" | "code";
  targets?: string[];
  needsRealtime?: boolean;
  needs3D?: boolean;
  needsBackend?: boolean;
}

export interface PlatformPlan {
  primary: CreativePlatform;
  supporting: CreativePlatform[];
  reasons: string[];
}

export function planPlatforms(intent: ProjectIntent): PlatformPlan {
  const category: PlatformCategory =
    intent.kind === "game" ? "game_engine" :
    intent.kind === "3d" || intent.needs3D ? "3d" :
    intent.kind === "backend" || intent.needsBackend ? "backend" :
    "app_builder";

  const candidates = listCreativePlatforms(category);

  const primary =
    candidates.find((p) => intent.kind === "game" && p.id === "unreal") ??
    candidates.find((p) => p.id === "godot") ??
    candidates[0];

  if (!primary) throw new Error("No suitable platform found");

  const supporting = listCreativePlatforms().filter((p) =>
    p.id !== primary.id &&
    (
      (intent.needsBackend && p.category === "backend") ||
      (intent.kind === "code" && p.category === "code") ||
      (intent.kind === "xr" && p.id === "unreal")
    )
  );

  return {
    primary,
    supporting,
    reasons: [
      `Primary platform selected for ${intent.kind} workflow.`,
      ...(intent.needsBackend ? ["Backend capability requested."] : []),
      ...(intent.needs3D ? ["3D capability requested."] : [])
    ]
  };
}
