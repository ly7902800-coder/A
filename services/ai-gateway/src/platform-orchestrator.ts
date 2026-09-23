import type { PlatformCategory, CreativePlatform } from "./creative-platforms.js";
import { listCreativePlatforms } from "./creative-platforms.js";

export interface ProjectIntent {
  kind: "game" | "3d" | "web" | "mobile" | "backend" | "xr" | "code" | "ai";
  targets?: string[];
  needsRealtime?: boolean;
  needs3D?: boolean;
  needsBackend?: boolean;
  needsAI?: boolean;
}

export interface PlatformPlan {
  primary: CreativePlatform;
  supporting: CreativePlatform[];
  reasons: string[];
}

export function planPlatforms(intent: ProjectIntent): PlatformPlan {
  const category: PlatformCategory =
    intent.kind === "game" ? "game_engine" :
    intent.kind === "xr" ? "xr" :
    intent.kind === "ai" || intent.needsAI ? "ai" :
    intent.kind === "3d" || intent.needs3D ? "3d" :
    intent.kind === "backend" || intent.needsBackend ? "backend" :
    intent.kind === "code" ? "code" :
    "app_builder";

  const candidates = listCreativePlatforms(category);

  const primary =
    candidates.find((p) => intent.kind === "game" && p.id === "unreal") ??
    candidates.find((p) => intent.kind === "xr" && p.id === "openxr") ??
    candidates.find((p) => intent.kind === "ai" && p.id === "huggingface") ??
    candidates.find((p) => p.id === "godot") ??
    candidates[0];

  if (!primary) throw new Error("No suitable platform found");

  const supporting = listCreativePlatforms().filter((p) =>
    p.id !== primary.id &&
    (
      (intent.needsBackend && p.category === "backend") ||
      (intent.kind === "code" && p.category === "code") ||
      (intent.kind === "xr" && (p.id === "unreal" || p.id === "unity")) ||
      (intent.needs3D && p.category === "3d") ||
      (intent.needsAI && p.category === "ai") ||
      (intent.targets?.includes("web") && ["vercel", "cloudflare"].includes(p.id))
    )
  );

  return {
    primary,
    supporting,
    reasons: [
      `Primary platform selected for ${intent.kind} workflow.`,
      ...(intent.needsBackend ? ["Backend capability requested."] : []),
      ...(intent.needs3D ? ["3D capability requested."] : []),
      ...(intent.needsAI ? ["AI/model capability requested."] : []),
      ...(intent.kind === "xr" ? ["XR runtime/API capability requested."] : [])
    ]
  };
}
