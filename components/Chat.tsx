"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentPlan, AgentResponse } from "@/lib/types";
import { PlanCard } from "./PlanCard";

type Turn =
  | { kind: "user"; text: string; ts: number }
  | { kind: "assistant"; plan: AgentPlan; ts: number }
  | { kind: "error"; text: string; ts: number };

const SUGGESTIONS = [
  "Help me prep for tomorrow's client demo",
  "I have 2 hours, what should I focus on?",
  "Plan a 30-min workout and a study block",
  "I'm overwhelmed — triage my day for me",
];

function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "anon";
  const KEY = "sda_user_id";
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = `u_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(KEY, id);
  return id;
}

export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const userId = useMemo(getOrCreateUserId, []);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const ts = Date.now();
    setTurns((t) => [...t, { kind: "user", text: trimmed, ts }]);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, userId }),
      });
      const data = (await res.json()) as AgentResponse;
      if (data.ok) {
        setTurns((t) => [...t, { kind: "assistant", plan: data.plan, ts: Date.now() }]);
      } else {
        setTurns((t) => [
          ...t,
          { kind: "error", text: data.error || "Something went wrong.", ts: Date.now() },
        ]);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Network error";
      setTurns((t) => [...t, { kind: "error", text: detail, ts: Date.now() }]);
    } finally {
      setPending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const isEmpty = turns.length === 0;

  return (
    <div className="mx-auto flex h-[100svh] max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-surface">
            <span className="font-display text-lg">S</span>
          </div>
          <div>
            <p className="font-display text-lg leading-tight">Smart Daily Assistant</p>
            <p className="text-xs text-muted">Web · Telegram · same brain</p>
          </div>
        </div>
        <a
          href="https://t.me/"
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-full border border-ink/15 bg-white/60 px-3 py-1.5 text-xs text-ink/80 backdrop-blur transition hover:bg-white sm:inline-flex"
        >
          Open on Telegram →
        </a>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto pb-6"
        aria-live="polite"
        aria-label="Conversation"
      >
        {isEmpty && (
          <div className="grain mt-2 rounded-3xl border border-ink/10 bg-white/60 p-6 shadow-card backdrop-blur">
            <p className="text-sm uppercase tracking-widest text-muted">Today</p>
            <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
              Tell me what you want to get done.
            </h1>
            <p className="mt-3 max-w-prose text-ink/70">
              I'll turn your message into a small, prioritized plan with concrete steps.
              If I'm missing something important, I'll ask one question instead of
              guessing.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-sm text-ink/80 transition hover:border-ink/30 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 pt-4">
          {turns.map((turn, i) => {
            if (turn.kind === "user") {
              return (
                <div key={i} className="flex justify-end fade-in">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-surface shadow-card">
                    {turn.text}
                  </div>
                </div>
              );
            }
            if (turn.kind === "assistant") {
              return (
                <div key={i} className="space-y-2">
                  <PlanCard plan={turn.plan} />
                </div>
              );
            }
            return (
              <div key={i} className="fade-in">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {turn.text}
                </div>
              </div>
            );
          })}
          {pending && (
            <div className="flex items-center gap-2 text-ink/60 fade-in">
              <span className="rounded-full bg-white px-3 py-2 shadow-card">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
              <span className="text-xs uppercase tracking-widest">Thinking</span>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 mb-4 rounded-2xl border border-ink/10 bg-white/85 p-2 shadow-card backdrop-blur"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="What's on your plate today?"
            rows={1}
            className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl bg-transparent px-3 py-2.5 text-base text-ink placeholder:text-ink/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-surface transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-accent"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <p className="px-2 pb-1 pt-1 text-[11px] text-muted">
          Press Enter to send · Shift+Enter for newline · Memory persists per browser
        </p>
      </form>
    </div>
  );
}
