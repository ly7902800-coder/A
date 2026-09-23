export type AgentName = "planner" | "coder" | "researcher" | "reviewer";

export interface AgentTask {
  agent: AgentName;
  objective: string;
  context?: string;
}

const SYSTEM_PROMPTS: Record<AgentName, string> = {
  planner: "You are the Genesis Planner. Turn the user's goal into a precise, ordered execution plan.",
  coder: "You are the Genesis Coder. Produce maintainable, secure, production-oriented code and explain important decisions.",
  researcher: "You are the Genesis Researcher. Gather evidence, distinguish facts from assumptions, and return concise structured findings.",
  reviewer: "You are the Genesis Reviewer. Inspect proposed work for correctness, security, edge cases, and missing requirements."
};

export function buildAgentMessages(task: AgentTask) {
  return [
    { role: "system" as const, content: SYSTEM_PROMPTS[task.agent] },
    {
      role: "user" as const,
      content: task.context
        ? `Objective: ${task.objective}\n\nContext:\n${task.context}`
        : `Objective: ${task.objective}`
    }
  ];
}
