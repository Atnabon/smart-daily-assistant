import type { AgentPlan, Priority } from "@/lib/types";

const PRIORITY_STYLE: Record<Priority, { label: string; chip: string; bar: string }> = {
  P1: {
    label: "Urgent",
    chip: "bg-red-50 text-red-700 ring-red-200",
    bar: "bg-red-500",
  },
  P2: {
    label: "Important",
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
    bar: "bg-amber-500",
  },
  P3: {
    label: "Nice to have",
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    bar: "bg-emerald-500",
  },
};

export function PlanCard({ plan }: { plan: AgentPlan }) {
  if (plan.needsFollowup && plan.followupQuestion) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-card backdrop-blur fade-in">
        <p className="text-sm uppercase tracking-widest text-muted">I need one detail</p>
        <p className="mt-2 font-display text-xl text-ink">{plan.summary}</p>
        <p className="mt-4 rounded-lg bg-ink/5 px-4 py-3 text-ink">
          {plan.followupQuestion}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-card backdrop-blur">
        <p className="text-sm uppercase tracking-widest text-muted">Plan</p>
        <p className="mt-2 font-display text-xl leading-snug text-ink">{plan.summary}</p>
      </div>

      <ol className="space-y-3">
        {plan.tasks.map((task, i) => {
          const style = PRIORITY_STYLE[task.priority];
          return (
            <li
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white/80 shadow-card backdrop-blur"
            >
              <div className={`absolute left-0 top-0 h-full w-1.5 ${style.bar}`} />
              <div className="p-5 pl-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-display text-lg text-ink">{task.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset ${style.chip}`}
                    >
                      {task.priority} · {style.label}
                    </span>
                    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 font-mono text-ink/70">
                      {task.estimatedMinutes}m
                    </span>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-ink/80">
                  {task.steps.map((step, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink/30" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
