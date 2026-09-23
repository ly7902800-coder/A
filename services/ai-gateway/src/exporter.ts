export interface ExportTarget {
  id: string;
  supported: boolean;
  notes: string;
}

const TARGETS: Record<string, string[]> = {
  web: ["vercel", "cloudflare", "playcanvas", "threejs", "babylonjs"],
  mobile: ["unreal", "unity", "godot"],
  desktop: ["unreal", "unity", "godot"],
  xr: ["openxr", "unreal", "unity", "babylonjs"]
};

export function listExportTargets(target: string): ExportTarget[] {
  return (TARGETS[target] ?? []).map((id) => ({
    id,
    supported: true,
    notes: "Export planning is available; actual build/export requires a configured runner."
  }));
}
