export type PlatformCategory =
  | "game_engine"
  | "3d"
  | "app_builder"
  | "code"
  | "backend"
  | "deployment"
  | "assets"
  | "xr"
  | "ai";

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
  },
  {
    id: "openxr",
    name: "Khronos OpenXR",
    category: "xr",
    freeTier: true,
    capabilities: ["xr", "vr", "ar", "mixed_reality", "cross_runtime"],
    adapterStatus: "catalog",
    website: "https://www.khronos.org/openxr/"
  },
  {
    id: "omniverse",
    name: "NVIDIA Omniverse",
    category: "3d",
    freeTier: true,
    capabilities: ["openusd", "3d", "simulation", "collaboration", "digital_twins", "rtx"],
    adapterStatus: "catalog",
    website: "https://www.nvidia.com/en-us/omniverse/"
  },
  {
    id: "threejs",
    name: "Three.js",
    category: "3d",
    freeTier: true,
    capabilities: ["webgl", "webgpu", "javascript", "typescript", "3d", "web"],
    adapterStatus: "catalog",
    website: "https://threejs.org/"
  },
  {
    id: "playcanvas",
    name: "PlayCanvas",
    category: "game_engine",
    freeTier: true,
    capabilities: ["web", "webgl", "webgpu", "3d", "javascript", "typescript"],
    adapterStatus: "catalog",
    website: "https://playcanvas.com/"
  },
  {
    id: "babylonjs",
    name: "Babylon.js",
    category: "3d",
    freeTier: true,
    capabilities: ["webgl", "webgpu", "typescript", "3d", "xr", "physics"],
    adapterStatus: "catalog",
    website: "https://www.babylonjs.com/"
  },
  {
    id: "firebase",
    name: "Firebase",
    category: "backend",
    freeTier: true,
    capabilities: ["auth", "database", "storage", "cloud_functions", "analytics", "messaging"],
    adapterStatus: "catalog",
    website: "https://firebase.google.com/"
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "deployment",
    freeTier: true,
    capabilities: ["workers", "pages", "edge", "durable_objects", "r2", "d1"],
    adapterStatus: "catalog",
    website: "https://www.cloudflare.com/"
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "deployment",
    freeTier: true,
    capabilities: ["web", "serverless", "edge", "preview_deployments", "typescript"],
    adapterStatus: "catalog",
    website: "https://vercel.com/"
  },
  {
    id: "docker",
    name: "Docker",
    category: "deployment",
    freeTier: true,
    capabilities: ["containers", "images", "builds", "compose", "portable_runtime"],
    adapterStatus: "catalog",
    website: "https://www.docker.com/"
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    category: "ai",
    freeTier: true,
    capabilities: ["models", "datasets", "inference", "transformers", "spaces", "ai"],
    adapterStatus: "catalog",
    website: "https://huggingface.co/"
  }
];

export function listCreativePlatforms(category?: PlatformCategory) {
  return CREATIVE_PLATFORMS.filter((platform) => !category || platform.category === category);
}
