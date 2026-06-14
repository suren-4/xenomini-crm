import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentPlanCardProps {
  plan: string[];
  completed?: boolean;
}

export function AgentPlanCard({ plan, completed = false }: AgentPlanCardProps) {
  if (!plan.length) return null;

  return (
    <div className="w-full mt-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <span className="text-[9px] font-bold tracking-widest text-[var(--accent)] uppercase">
          Agent plan
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {plan.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <div
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                completed
                  ? "bg-[var(--success-bg)] text-[var(--success)]"
                  : "bg-[var(--accent-muted)] text-[var(--accent)]"
              )}
            >
              {completed ? (
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              ) : (
                <Circle className="w-2 h-2 fill-current" />
              )}
            </div>
            <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">
              <span className="text-[var(--text-muted)] font-mono mr-1">{i + 1}.</span>
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
