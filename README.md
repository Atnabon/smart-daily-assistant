# Smart Daily Assistant Agent

An agentic AI assistant that turns a user's request into a small, **prioritized action plan**. The same agent core powers two channels:

- a **web chatbot** (Next.js App Router, deployed on Vercel)
- a **Telegram bot** (webhook → same Next.js API)

Both surfaces share one agent module (`lib/agent.ts`) that calls an LLM through **OpenRouter** (defaulting to Google Gemini 2.0 Flash, swappable to Claude / GPT / Llama via one env var). Channel adapters (`app/api/chat`, `app/api/telegram`) only handle transport — they don't reimplement the agent.

> Built for the EL LLC AI assessment. Goal: ship a working MVP that demonstrates clear architecture, secret hygiene, and useful agentic behavior.

---

## Live demo

| Surface | Link |
| --- | --- |
| Web chatbot | `https://<your-app>.vercel.app` |
| Telegram bot | `@<your-bot>_bot` |
| GitHub repo | `https://github.com/<you>/smart-daily-assistant` |
| Demo video (Loom) | `https://www.loom.com/share/<id>` |

Replace these placeholders after you deploy. The video script lives in `DEMO_VIDEO_SCRIPT.md`.

---

## What "agentic" means here

For every user message, the agent:

1. **Understands the goal** — restates it in one sentence.
2. **Decides if it can act** — if information is genuinely missing, it asks **one** specific follow-up question instead of guessing.
3. **Decomposes into tasks** — a small set (1–6) of concrete, actionable items.
4. **Prioritizes** — every task gets P1 (urgent + important), P2 (important, not urgent), or P3 (nice to have).
5. **Estimates effort** — minutes per task.
6. **Lists steps** — 2–6 imperative steps per task.

The structure is requested via OpenAI-compatible `response_format: { type: "json_object" }` (which OpenRouter forwards to the underlying model) and the system prompt inlines the exact JSON schema. The result is then re-validated server-side in `lib/agent.ts → normalizePlan()` so a malformed payload can never crash the UI — defense in depth, regardless of which model is plugged in.

Conversation memory persists for ~12 turns per (channel, user) pair so follow-ups have context.

---

## Architecture

```
                  ┌──────────────┐         ┌──────────────────┐
  Web browser ──► │ /api/chat    │ ──┐     │   OpenRouter     │
                  └──────────────┘   │     │ (Gemini / Claude │
                                     ├──►  │  / GPT / Llama)  │
                  ┌──────────────┐   │     └──────────────────┘
  Telegram   ───► │ /api/telegram│ ──┘            ▲
                  └──────────────┘                │
                          │                       │
                          ▼                       │
                  ┌──────────────┐    ┌──────────────────┐
                  │ lib/agent.ts │ ──►│   lib/llm.ts     │
                  │  (shared     │    │ (OpenAI SDK →    │
                  │   core)      │    │  OpenRouter URL) │
                  └──────┬───────┘    └──────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ lib/memory.ts│  per-(channel,user) history
                  └──────────────┘
```

Key separation:

| Layer | Lives in | Knows about |
| --- | --- | --- |
| Channel adapters | `app/api/chat`, `app/api/telegram`, `lib/telegram.ts` | HTTP, Telegram message shape, web JSON shape |
| Agent core | `lib/agent.ts`, `lib/llm.ts`, `lib/prompts.ts` | LLM, schema, history |
| Memory | `lib/memory.ts` | (channel, userId) → conversation |
| UI | `app/page.tsx`, `components/Chat.tsx`, `components/PlanCard.tsx` | rendering plans |

Switching providers is one env var: change `OPENROUTER_MODEL` (e.g. from `google/gemini-2.0-flash-001` to `anthropic/claude-3.5-haiku` or `openai/gpt-4o-mini`). No code changes — `lib/llm.ts` always speaks the OpenAI chat-completions API; OpenRouter handles the routing.

A new channel (Slack, Discord, WhatsApp) is ~50 lines: parse incoming → call `runAgent({ channel, userId, message })` → format response.

---

## Repository layout

```
smart-daily-assistant/
├── app/
│   ├── api/
│   │   ├── chat/route.ts           # Web chat endpoint
│   │   └── telegram/route.ts       # Telegram webhook
│   ├── globals.css                 # Design tokens + grain texture
│   ├── layout.tsx
│   └── page.tsx                    # Web chat UI shell
├── components/
│   ├── Chat.tsx                    # Client-side chat (state, suggestions, input)
│   └── PlanCard.tsx                # Pretty plan rendering with priority bars
├── lib/
│   ├── agent.ts                    # ⭐ shared agent core (runAgent)
│   ├── env.ts                      # Fail-fast env validation
│   ├── llm.ts                      # OpenAI SDK pointed at OpenRouter
│   ├── memory.ts                   # In-memory conversation store
│   ├── prompts.ts                  # System prompt + inlined JSON schema
│   ├── telegram.ts                 # sendMessage, plan formatter
│   └── types.ts                    # AgentPlan, AgentResponse, ChatMessage
├── scripts/
│   ├── set-telegram-webhook.ts     # Register webhook with Telegram
│   └── delete-telegram-webhook.ts
├── .env.example                    # Template — safe to commit
├── .gitignore                      # .env* are ignored
├── DEMO_VIDEO_SCRIPT.md            # 5-min Loom outline
├── next.config.ts
├── package.json
├── postcss.config.mjs              # Tailwind 4 (CSS-first config)
├── tsconfig.json
└── vercel.json
```

---

## Local setup

### 1. Install

```bash
git clone https://github.com/<you>/smart-daily-assistant.git
cd smart-daily-assistant
pnpm install   # or npm install
```

### 2. Add secrets

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

| Variable | Required | Where to get it |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | yes | https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | no (default `google/gemini-2.0-flash-001`) | https://openrouter.ai/models |
| `OPENROUTER_SITE_NAME` | no (recommended) | leaderboard attribution |
| `OPENROUTER_SITE_URL` | no (recommended) | leaderboard attribution |
| `TELEGRAM_BOT_TOKEN` | yes (for bot) | https://t.me/BotFather → `/newbot` |
| `TELEGRAM_WEBHOOK_SECRET` | recommended | `openssl rand -hex 24` |
| `APP_URL` | only for webhook script | your public URL |

### 3. Run the web app

```bash
pnpm dev
# → http://localhost:3000
```

The web chat is fully functional once `OPENROUTER_API_KEY` is set.

### 4. Run the Telegram bot locally

Telegram needs a public URL to send webhook updates. Easiest path during development:

```bash
# in another terminal, expose port 3000
npx ngrok http 3000
# → forwarding https://abcd-12-34-56-78.ngrok-free.app -> http://localhost:3000

# register the webhook
APP_URL=https://abcd-12-34-56-78.ngrok-free.app pnpm telegram:set-webhook
```

Now message your bot — replies should arrive in your terminal logs.

To stop receiving updates:

```bash
pnpm telegram:delete-webhook
```

---

## Deployment (Vercel)

1. **Push to GitHub** — make sure `.env.local` is **not** committed (`.gitignore` already excludes it).
2. **Import in Vercel** — point at the GitHub repo, framework: Next.js (auto-detected).
3. **Add env vars** in Vercel → Settings → Environment Variables:
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL` (optional)
   - `OPENROUTER_SITE_NAME` (optional)
   - `OPENROUTER_SITE_URL` (optional)
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
4. **Deploy.** Vercel will give you `https://<project>.vercel.app`.
5. **Register the Telegram webhook** against your prod URL:
   ```bash
   APP_URL=https://<project>.vercel.app \
   TELEGRAM_BOT_TOKEN=... \
   TELEGRAM_WEBHOOK_SECRET=... \
   npm run telegram:set-webhook
   ```
6. **Test in Telegram** — send your bot a message.

---

## Security notes

This repo is designed to be **public** without leaking anything sensitive.

- ✅ **No secrets in code.** All keys are read from `process.env` via `lib/env.ts`, which throws a descriptive error if a required key is missing. Secrets never reach the browser.
- ✅ **`.env*` is git-ignored.** Only `.env.example` (placeholders) is committed.
- ✅ **All AI calls happen server-side.** The browser hits `/api/chat`; only the Next.js server talks to OpenRouter. The OpenRouter key never ships to the client.
- ✅ **Webhook authenticity.** When `TELEGRAM_WEBHOOK_SECRET` is set, the Telegram route verifies the `X-Telegram-Bot-Api-Secret-Token` header on every incoming update and rejects mismatches with 401.
- ✅ **Strict input handling.** User input has a length cap (via the userId trim) and is JSON-parsed defensively. Model output is always JSON-parsed and re-validated before reaching the UI, so a hallucinated payload can't break rendering.
- ✅ **No `dangerouslySetInnerHTML`.** All rendering is plain React; no XSS surface from model output.
- ✅ **`poweredByHeader` disabled** in `next.config.ts` to reduce fingerprinting.

If you fork: rotate `TELEGRAM_BOT_TOKEN` and `OPENROUTER_API_KEY` immediately if either is exposed. BotFather can issue a fresh token via `/revoke` then `/token`. OpenRouter keys can be revoked at https://openrouter.ai/keys.

---

## API reference

### `POST /api/chat`

```json
// request
{ "userId": "u_abc", "message": "Plan my day around two meetings and a 5pm gym slot" }
```

```json
// response (success)
{
  "ok": true,
  "plan": {
    "summary": "Anchor your day around the meetings, fit deep work between them, hit the 5pm gym.",
    "needsFollowup": false,
    "followupQuestion": null,
    "tasks": [
      {
        "title": "Prep notes for 10am stand-up",
        "priority": "P1",
        "estimatedMinutes": 20,
        "steps": ["Review yesterday's blockers", "List 3 priorities for today", "Send agenda to channel"]
      }
    ]
  },
  "raw": "{...}"
}
```

```json
// response (model couldn't parse)
{ "ok": false, "error": "Model returned non-JSON output", "raw": "..." }
```

### `POST /api/telegram`

Telegram-formatted update payload from the Bot API. Returns `{ "ok": true }` and sends the formatted plan back via `sendMessage`. Commands handled: `/start`, `/help`, `/reset`.

---

## Limitations & next steps

Honest list — none of these block the MVP, but they're what I'd build next.

- **In-process memory.** `lib/memory.ts` is an in-memory `Map`, which is perfect for demoing but resets on serverless cold start. Next: swap to **Vercel KV** or **Upstash Redis** behind the same interface — only `memory.ts` changes.
- **No streaming.** Web responses arrive in one chunk. Next: switch `/api/chat` to a streaming response and progressively render the plan as the model emits it. The schema-validated path makes streaming partial JSON tricky, so a fallback to free-form streaming + post-validation is a reasonable trade.
- **No rate limiting.** Add an Upstash rate-limit middleware on both API routes (per IP for web, per `chat_id` for Telegram).
- **No tests.** A handful of unit tests on `normalizePlan()` would lock the contract; an integration test against a recorded OpenRouter response would lock the loop. Skipped for the assessment timebox.
- **One provider.** OpenRouter already gives me model-level swappability via `OPENROUTER_MODEL`, but if I want to fall back to a different gateway entirely (NVIDIA NIM, direct Gemini, local Ollama), I'd extract a `Provider` interface in `lib/llm.ts` and pick via `LLM_PROVIDER` env.
- **Single-language.** Prompt + system message are English-only. Localization is straightforward but out of scope.

---

## License

MIT. See `LICENSE` if present, or treat this as MIT-licensed for the purposes of the assessment.
