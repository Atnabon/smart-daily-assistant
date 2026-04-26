import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { env } from "@/lib/env";
import { resetHistory } from "@/lib/memory";
import {
  HELP_TEXT,
  formatPlanForTelegram,
  sendTelegramChatAction,
  sendTelegramMessage,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from?: { id: number; username?: string };
  text?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "smart-daily-assistant",
    channel: "telegram",
  });
}

export async function POST(req: Request) {
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const msg = update.message ?? update.edited_message;
  if (!msg || !msg.text) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const chatId = msg.chat.id;
  const userId = String(msg.from?.id ?? chatId);
  const text = msg.text.trim();

  try {
    if (text === "/start" || text === "/help") {
      await sendTelegramMessage({ chatId, text: HELP_TEXT, parseMode: "Markdown" });
      return NextResponse.json({ ok: true });
    }

    if (text === "/reset") {
      resetHistory("telegram", userId);
      await sendTelegramMessage({
        chatId,
        text: "Memory cleared. What would you like to plan next?",
      });
      return NextResponse.json({ ok: true });
    }

    await sendTelegramChatAction(chatId, "typing");
    const response = await runAgent({ channel: "telegram", userId, message: text });

    if (!response.ok) {
      await sendTelegramMessage({
        chatId,
        text: `Sorry, I had trouble with that: ${response.error}`,
      });
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage({
      chatId,
      text: formatPlanForTelegram(response.plan),
      parseMode: "Markdown",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[telegram] webhook error:", detail);
    try {
      await sendTelegramMessage({
        chatId,
        text: "Something went wrong on my side. Please try again in a moment.",
      });
    } catch {
      /* swallow */
    }
    return NextResponse.json({ ok: false, error: detail }, { status: 200 });
  }
}
