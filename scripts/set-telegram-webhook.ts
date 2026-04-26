/**
 * Register the Telegram webhook with the Bot API.
 *
 * Usage:
 *   APP_URL=https://your-app.vercel.app \
 *   TELEGRAM_BOT_TOKEN=... \
 *   TELEGRAM_WEBHOOK_SECRET=... \
 *   npm run telegram:set-webhook
 *
 * Or with a one-off URL override:
 *   npm run telegram:set-webhook -- https://your-app.vercel.app
 */

export {};

const url = process.argv[2] ?? process.env.APP_URL;
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}
if (!url) {
  console.error("APP_URL is required (or pass URL as first arg)");
  process.exit(1);
}

const webhookUrl = `${url.replace(/\/$/, "")}/api/telegram`;

const body: Record<string, unknown> = {
  url: webhookUrl,
  allowed_updates: ["message", "edited_message"],
  drop_pending_updates: true,
};
if (secret) body.secret_token = secret;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const json = await res.json();
console.log(JSON.stringify(json, null, 2));
if (!json.ok) process.exit(1);

console.log(`\nWebhook registered: ${webhookUrl}`);
