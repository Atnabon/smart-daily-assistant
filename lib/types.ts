export type Priority = "P1" | "P2" | "P3";

export type PlanTask = {
  title: string;
  priority: Priority;
  estimatedMinutes: number;
  steps: string[];
};

export type AgentPlan = {
  summary: string;
  needsFollowup: boolean;
  followupQuestion: string | null;
  tasks: PlanTask[];
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  text: string;
  ts: number;
};

export type Channel = "web" | "telegram";

export type AgentRequest = {
  channel: Channel;
  userId: string;
  message: string;
};

export type AgentResponse = {
  ok: true;
  plan: AgentPlan;
  raw: string;
} | {
  ok: false;
  error: string;
  raw?: string;
};
