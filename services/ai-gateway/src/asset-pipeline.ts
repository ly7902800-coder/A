export interface AssetPipelinePlan {
  stages: string[];
  formats: string[];
}

export function createAssetPipeline(): AssetPipelinePlan {
  return {
    stages: ["model", "materials", "rig", "animation", "optimize", "validate", "export"],
    formats: ["glTF", "GLB", "FBX", "OBJ"]
  };
}
