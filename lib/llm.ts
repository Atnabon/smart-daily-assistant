import OpenAI from "openai";
import { env } from "./env";
import { SYSTEM_PROMPT } from "./prompts";
import type { ChatMessage } from "./types";

let cached: OpenAI | null = null;

function getClient(): OpenAI {
  if (cached) return cached;
  const headers: Record<string, string> = {};
  const referer = env.OPENROUTER_SITE_URL;
  const title = env.OPENROUTER_SITE_NAME;
  if (referer) headers["HTTP-Referer"] = referer;
  if (title) headers["X-Title"] = title;

  cached = new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: env.OPENROUTER_BASE_URL,
    defaultHeaders: headers,
  });
  return cached;
}

interface CompletionInput {
  history: readonly ChatMessage[];
  message: string;
}

interface CompletionResult {
  raw: string;
  model: string;
}

export async function generatePlanCompletion({
  history,
  message,
}: CompletionInput): Promise<CompletionResult> {
  const client = getClient();
  const model = env.OPENROUTER_MODEL;

  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: "user", content: message },
  ];

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.6,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  if (!raw.trim()) {
    throw new Error("LLM returned empty response");
  }
  return { raw, model };
}
