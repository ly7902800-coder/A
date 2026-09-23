import { evaluatePermission, type PermissionRequest } from "./permissions.js";

export interface ToolDefinition {
  name: string;
  description: string;
  permission: PermissionRequest;
  execute(input: unknown): Promise<unknown>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  list() {
    return [...this.tools.values()].map(({ name, description, permission }) => ({
      name,
      description,
      permission
    }));
  }

  async execute(name: string, input: unknown) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);

    const decision = evaluatePermission(tool.permission);

    if (!decision.allowed) {
      return {
        status: "approval_required",
        tool: name,
        action: tool.permission.action,
        resource: tool.permission.resource,
        reason: tool.permission.reason
      };
    }

    return {
      status: "completed",
      tool: name,
      result: await tool.execute(input)
    };
  }
}

export function createDefaultToolRegistry() {
  const registry = new ToolRegistry();

  registry.register({
    name: "system.health",
    description: "Read the health state of Genesis services.",
    permission: {
      action: "read",
      resource: "system",
      reason: "Health inspection is read-only."
    },
    async execute() {
      return { ok: true };
    }
  });

  registry.register({
    name: "project.delete",
    description: "Delete a project only after explicit user approval.",
    permission: {
      action: "delete",
      resource: "project",
      reason: "Project deletion is destructive."
    },
    async execute(input) {
      return { blocked: true, input };
    }
  });

  registry.register({
    name: "release.publish",
    description: "Publish a release only after explicit user approval.",
    permission: {
      action: "publish",
      resource: "release",
      reason: "Publishing creates an external side effect."
    },
    async execute(input) {
      return { blocked: true, input };
    }
  });

  return registry;
}
