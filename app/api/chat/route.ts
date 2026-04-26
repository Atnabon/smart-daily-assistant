import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatBody = {
  message?: unknown;
  userId?: unknown;
};

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message : "";
  const userId =
    typeof body.userId === "string" && body.userId.trim().length > 0
      ? body.userId.trim().slice(0, 64)
      : "anon";

  if (!message.trim()) {
    return NextResponse.json(
      { ok: false, error: "message is required" },
      { status: 400 }
    );
  }

  const response = await runAgent({ channel: "web", userId, message });
  return NextResponse.json(response, { status: response.ok ? 200 : 502 });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "smart-daily-assistant",
    channel: "web",
  });
}
