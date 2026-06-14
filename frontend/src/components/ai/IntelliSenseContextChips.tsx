import { Users, Radio, Sparkles } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { MessageTone } from "@/lib/api";

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  rcs: "RCS",
};

const TONE_LABELS: Record<MessageTone, string> = {
  friendly: "Friendly",
  professional: "Professional",
  urgent: "Urgent",
};

interface IntelliSenseContextChipsProps {
  segmentName?: string;
  audienceSize?: number;
  channel?: string;
  tone?: MessageTone;
  className?: string;
}

export function IntelliSenseContextChips({
  segmentName,
  audienceSize,
  channel,
  tone,
  className,
}: IntelliSenseContextChipsProps) {
  if (!segmentName && !channel) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)]",
        className
      )}
    >
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wide mr-1">
        <Sparkles className="w-3 h-3" />
        AI context
      </span>
      {segmentName && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]">
          <Users className="w-3 h-3 text-[var(--text-subtle)]" />
          {segmentName}
          {audienceSize != null && (
            <span className="text-[var(--text-subtle)]">({formatNumber(audienceSize)})</span>
          )}
        </span>
      )}
      {channel && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]">
          <Radio className="w-3 h-3 text-[var(--text-subtle)]" />
          {CHANNEL_LABELS[channel] ?? channel}
        </span>
      )}
      {tone && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]">
          {TONE_LABELS[tone]} tone
        </span>
      )}
    </div>
  );
}
