import { generatePlanCompletion } from "./llm";
import { appendHistory, getHistory } from "./memory";
import type {
  AgentPlan,
  AgentRequest,
  AgentResponse,
  ChatMessage,
  PlanTask,
  Priority,
} from "./types";

const VALID_PRIORITIES: ReadonlySet<Priority> = new Set(["P1", "P2", "P3"]);

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalizePlan(raw: unknown): AgentPlan {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Model response was not an object");
  }
  const obj = raw as Record<string, unknown>;
  const summary =
    typeof obj.summary === "string" && obj.summary.trim().length > 0
      ? obj.summary.trim()
      : "Here's what I can help with.";

  const needsFollowup = obj.needsFollowup === true;
  const rawFollowup =
    typeof obj.followupQuestion === "string" ? obj.followupQuestion.trim() : "";
  const followupQuestion =
    needsFollowup && rawFollowup.length > 0 ? rawFollowup : null;

  const rawTasks = Array.isArray(obj.tasks) ? obj.tasks : [];
  const tasks: PlanTask[] = rawTasks
    .slice(0, 6)
    .map((t): PlanTask | null => {
      if (typeof t !== "object" || t === null) return null;
      const r = t as Record<string, unknown>;
      const title = typeof r.title === "string" ? r.title.trim() : "";
      if (!title) return null;
      const priority = (
        typeof r.priority === "string" ? r.priority : "P2"
      ) as Priority;
      const safePriority: Priority = VALID_PRIORITIES.has(priority)
        ? priority
        : "P2";
      const minutes = clamp(Number(r.estimatedMinutes ?? 30), 5, 480);
      const stepsRaw = Array.isArray(r.steps) ? r.steps : [];
      const steps = stepsRaw
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 8);
      return {
        title,
        priority: safePriority,
        estimatedMinutes: minutes,
        steps: steps.length > 0 ? steps : ["Start working on this task."],
      };
    })
    .filter((t): t is PlanTask => t !== null);

  return { summary, needsFollowup, followupQuestion, tasks };
}

function plansToText(plan: AgentPlan): string {
  if (plan.needsFollowup && plan.followupQuestion) {
    return `${plan.summary}\n\nFollow-up: ${plan.followupQuestion}`;
  }
  const lines = [plan.summary, ""];
  plan.tasks.forEach((task, i) => {
    lines.push(
      `${i + 1}. [${task.priority} · ${task.estimatedMinutes}m] ${task.title}`
    );
    task.steps.forEach((s) => lines.push(`   - ${s}`));
  });
  return lines.join("\n").trim();
}

export async function runAgent(req: AgentRequest): Promise<AgentResponse> {
  const { channel, userId, message } = req;
  const trimmed = message.trim();
  if (!trimmed) {
    return { ok: false, error: "Empty message" };
  }

  const history = getHistory(channel, userId);

  let raw = "";
  try {
    const result = await generatePlanCompletion({ history, message: trimmed });
    raw = result.raw;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `OpenRouter call failed: ${detail}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: "Model returned non-JSON output",
      raw,
    };
  }

  let plan: AgentPlan;
  try {
    plan = normalizePlan(parsed);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: detail, raw };
  }

  const now = Date.now();
  const userMsg: ChatMessage = { role: "user", text: trimmed, ts: now };
  const assistantMsg: ChatMessage = {
    role: "assistant",
    text: plansToText(plan),
    ts: now,
  };
  appendHistory(channel, userId, userMsg);
  appendHistory(channel, userId, assistantMsg);

  return { ok: true, plan, raw };
}

export { plansToText };
