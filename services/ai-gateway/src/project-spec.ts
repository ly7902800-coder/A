export type ProjectKind = "app" | "game" | "3d" | "web" | "mobile" | "backend" | "xr" | "ai";

export interface ProjectSpec {
  id: string;
  name: string;
  kind: ProjectKind;
  description: string;
  targets: string[];
  platforms: string[];
  features: string[];
  backend?: { provider?: string; realtime?: boolean; auth?: boolean; storage?: boolean };
  buildTargets?: string[];
}

export function validateProjectSpec(spec: ProjectSpec): string[] {
  const errors: string[] = [];
  if (!spec.id || !/^[a-z0-9-]{2,80}$/.test(spec.id)) errors.push("id must be 2-80 lowercase characters, digits or hyphens");
  if (!spec.name?.trim()) errors.push("name is required");
  if (!spec.kind) errors.push("kind is required");
  if (!Array.isArray(spec.targets)) errors.push("targets must be an array");
  if (!Array.isArray(spec.platforms)) errors.push("platforms must be an array");
  if (!Array.isArray(spec.features)) errors.push("features must be an array");
  return errors;
}
