import { env } from "./env";
import type { AgentPlan } from "./types";

const TELEGRAM_API = "https://api.telegram.org";

type SendMessageOptions = {
  chatId: number | string;
  text: string;
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
  replyToMessageId?: number;
};

export async function sendTelegramMessage(opts: SendMessageOptions): Promise<void> {
  const url = `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload: Record<string, unknown> = {
    chat_id: opts.chatId,
    text: opts.text,
    disable_web_page_preview: true,
  };
  if (opts.parseMode) payload.parse_mode = opts.parseMode;
  if (opts.replyToMessageId) payload.reply_to_message_id = opts.replyToMessageId;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed (${res.status}): ${detail}`);
  }
}

export async function sendTelegramChatAction(
  chatId: number | string,
  action: "typing" | "upload_photo" = "typing"
): Promise<void> {
  const url = `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action }),
  }).catch(() => {
    /* best-effort */
  });
}

const PRIORITY_EMOJI: Record<string, string> = {
  P1: "🔴",
  P2: "🟡",
  P3: "🟢",
};

function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, "\\$1");
}

export function formatPlanForTelegram(plan: AgentPlan): string {
  if (plan.needsFollowup && plan.followupQuestion) {
    return [
      `*${escapeMarkdown(plan.summary)}*`,
      "",
      `❓ ${escapeMarkdown(plan.followupQuestion)}`,
    ].join("\n");
  }

  const lines: string[] = [`*${escapeMarkdown(plan.summary)}*`, ""];
  plan.tasks.forEach((task, i) => {
    const emoji = PRIORITY_EMOJI[task.priority] ?? "⚪";
    lines.push(
      `${i + 1}. ${emoji} *${escapeMarkdown(task.title)}* _(${task.priority} · ${task.estimatedMinutes}m)_`
    );
    task.steps.forEach((step) => {
      lines.push(`   • ${escapeMarkdown(step)}`);
    });
    lines.push("");
  });
  return lines.join("\n").trim();
}

export const HELP_TEXT = [
  "*Smart Daily Assistant*",
  "",
  "Tell me what you want to get done today and I'll turn it into a prioritized plan.",
  "",
  "Examples:",
  "• `Help me prep for tomorrow's client demo`",
  "• `I have 2 hours, what should I focus on?`",
  "• `Plan a 30-min workout and a study block`",
  "",
  "Commands:",
  "/start — show this message",
  "/help — show this message",
  "/reset — clear our conversation memory",
].join("\n");
