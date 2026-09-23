export type PlatformCategory =
  | "game_engine"
  | "3d"
  | "app_builder"
  | "code"
  | "backend"
  | "deployment"
  | "assets";

export interface CreativePlatform {
  id: string;
  name: string;
  category: PlatformCategory;
  freeTier: boolean;
  capabilities: string[];
  adapterStatus: "catalog" | "api";
  website: string;
}

export const CREATIVE_PLATFORMS: CreativePlatform[] = [
  {
    id: "unreal",
    name: "Unreal Engine",
    category: "game_engine",
    freeTier: true,
    capabilities: ["3d", "c++", "blueprints", "mobile", "pc", "console", "vr"],
    adapterStatus: "catalog",
    website: "https://www.unrealengine.com/"
  },
  {
    id: "godot",
    name: "Godot",
    category: "game_engine",
    freeTier: true,
    capabilities: ["2d", "3d", "gdscript", "csharp", "mobile", "web", "desktop"],
    adapterStatus: "catalog",
    website: "https://godotengine.org/"
  },
  {
    id: "blender",
    name: "Blender",
    category: "3d",
    freeTier: true,
    capabilities: ["modeling", "sculpting", "animation", "rigging", "rendering", "python"],
    adapterStatus: "catalog",
    website: "https://www.blender.org/"
  },
  {
    id: "unity",
    name: "Unity",
    category: "game_engine",
    freeTier: true,
    capabilities: ["2d", "3d", "csharp", "mobile", "web", "desktop", "xr"],
    adapterStatus: "catalog",
    website: "https://unity.com/"
  },
  {
    id: "replit",
    name: "Replit",
    category: "app_builder",
    freeTier: true,
    capabilities: ["web", "backend", "javascript", "typescript", "python"],
    adapterStatus: "catalog",
    website: "https://replit.com/"
  },
  {
    id: "github",
    name: "GitHub",
    category: "code",
    freeTier: true,
    capabilities: ["git", "repositories", "pull_requests", "actions", "code_review"],
    adapterStatus: "api",
    website: "https://github.com/"
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "backend",
    freeTier: true,
    capabilities: ["postgres", "auth", "storage", "realtime", "edge_functions"],
    adapterStatus: "catalog",
    website: "https://supabase.com/"
  },
  {
    id: "railway",
    name: "Railway",
    category: "deployment",
    freeTier: false,
    capabilities: ["containers", "databases", "deployments", "logs"],
    adapterStatus: "catalog",
    website: "https://railway.com/"
  }
];

export function listCreativePlatforms(category?: PlatformCategory) {
  return CREATIVE_PLATFORMS.filter((platform) => !category || platform.category === category);
}
