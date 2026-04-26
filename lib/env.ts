function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local for development or in your Vercel project settings for production.`
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  get OPENROUTER_API_KEY(): string {
    return required("OPENROUTER_API_KEY");
  },
  get OPENROUTER_MODEL(): string {
    return optional("OPENROUTER_MODEL", "google/gemini-3-flash-preview");
  },
  get OPENROUTER_BASE_URL(): string {
    return optional("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1");
  },
  get OPENROUTER_SITE_NAME(): string {
    return optional("OPENROUTER_SITE_NAME", "Smart Daily Assistant");
  },
  get OPENROUTER_SITE_URL(): string {
    return optional(
      "OPENROUTER_SITE_URL",
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
    );
  },
  get TELEGRAM_BOT_TOKEN(): string {
    return required("TELEGRAM_BOT_TOKEN");
  },
  get TELEGRAM_WEBHOOK_SECRET(): string {
    return optional("TELEGRAM_WEBHOOK_SECRET", "");
  },
  get APP_URL(): string {
    return optional(
      "APP_URL",
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
    );
  },
};
