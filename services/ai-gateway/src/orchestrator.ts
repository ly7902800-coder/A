import type { AgentName } from "./agents.js";
import { buildAgentMessages } from "./agents.js";
import type { ChatRequest, ChatResponse } from "./types.js";

export interface AgentStep {
  agent: AgentName;
  objective: string;
  output?: string;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
}

export interface OrchestrationResult {
  runId: string;
  steps: AgentStep[];
  finalOutput: string;
}

export interface ChatExecutor {
  execute(request: ChatRequest): Promise<ChatResponse>;
}

const PIPELINE: AgentName[] = ["planner", "coder", "reviewer"];

function makeId() {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function runAgentPipeline(
  objective: string,
  context: string | undefined,
  model: string,
  executor: ChatExecutor
): Promise<OrchestrationResult> {
  const runId = makeId();
  const steps: AgentStep[] = PIPELINE.map((agent) => ({
    agent,
    objective,
    status: "pending"
  }));

  let workingContext = context ?? "";
  let finalOutput = "";

  for (const step of steps) {
    step.status = "running";

    try {
      const messages = buildAgentMessages({
        agent: step.agent,
        objective,
        context: workingContext
      });

      const result = await executor.execute({
        model,
        messages
      });

      step.output = result.text;
      step.status = "completed";
      workingContext += `\n\n[${step.agent} output]\n${result.text}`;
      finalOutput = result.text;
    } catch (error) {
      step.status = "failed";
      step.error = error instanceof Error ? error.message : "Agent failed";
      throw error;
    }
  }

  return { runId, steps, finalOutput };
}
