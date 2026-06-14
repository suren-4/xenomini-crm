import { Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  rcs: "RCS",
};

interface AiChannelSuggestionProps {
  channel: string;
  confidence: number;
  reason: string;
  currentChannel: string;
  onAccept: (channel: string) => void;
  onDismiss: () => void;
  loading?: boolean;
  stats?: { openRate: number; deliveryRate: number; clickRate: number };
  className?: string;
}

export function AiChannelSuggestion({
  channel,
  confidence,
  reason,
  currentChannel,
  onAccept,
  onDismiss,
  loading,
  stats,
  className,
}: AiChannelSuggestionProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2.5 text-xs text-[var(--text-muted)]",
          className
        )}
      >
        Analyzing channel performance…
      </div>
    );
  }

  const label = CHANNEL_LABELS[channel] ?? channel;
  const alreadySelected = currentChannel === channel;

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--accent-muted)] bg-[var(--accent-light)] px-3 py-3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Recommended Channel: {label}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{reason}</p>
            {stats && (
              <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                Open {stats.openRate}% · Delivery {stats.deliveryRate}% · CTR {stats.clickRate}%
              </p>
            )}
            <p className="text-[10px] text-[var(--text-subtle)] mt-1">
              {Math.round(confidence * 100)}% confidence
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded text-[var(--text-subtle)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-muted)] transition-colors"
          aria-label="Dismiss channel recommendation"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {!alreadySelected && (
        <button
          type="button"
          onClick={() => onAccept(channel)}
          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Use {label}
        </button>
      )}
      {alreadySelected && (
        <p className="mt-2 text-xs text-[var(--success)] font-medium flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          {label} already selected
        </p>
      )}
    </div>
  );
}
