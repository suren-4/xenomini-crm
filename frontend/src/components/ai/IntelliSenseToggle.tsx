import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIntelliSenseEnabled } from "@/context/IntelliSenseContext";

interface IntelliSenseToggleProps {
  className?: string;
  compact?: boolean;
}

export function IntelliSenseToggle({ className, compact }: IntelliSenseToggleProps) {
  const { enabled, setEnabled } = useIntelliSenseEnabled();

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 cursor-pointer select-none",
        className
      )}
    >
      <Sparkles
        className={cn(
          "shrink-0 transition-colors",
          compact ? "w-3.5 h-3.5" : "w-4 h-4",
          enabled ? "text-[var(--accent)]" : "text-[var(--text-subtle)]"
        )}
        strokeWidth={1.75}
      />
      {!compact && (
        <span className="text-xs font-medium text-[var(--text-secondary)]">AI Suggestions</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus-ring",
          enabled ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-[var(--bg-card)] shadow-[var(--shadow)] transform transition-transform mt-0.5",
            enabled ? "translate-x-[18px] ml-0.5" : "translate-x-0.5"
          )}
        />
      </button>
      {!compact && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
          {enabled ? "On" : "Off"}
        </span>
      )}
    </label>
  );
}
