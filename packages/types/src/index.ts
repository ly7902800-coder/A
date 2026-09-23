export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
}

export interface ModelDescriptor {
  id: string;
  provider: string;
  name: string;
  capabilities: string[];
}
