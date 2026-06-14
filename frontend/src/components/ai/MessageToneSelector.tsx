import { cn } from "@/lib/utils";
import type { MessageTone } from "@/lib/api";

const TONES: { id: MessageTone; label: string }[] = [
  { id: "friendly", label: "Friendly" },
  { id: "professional", label: "Professional" },
  { id: "urgent", label: "Urgent" },
];

interface MessageToneSelectorProps {
  value: MessageTone;
  onChange: (tone: MessageTone) => void;
  className?: string;
}

export function MessageToneSelector({ value, onChange, className }: MessageToneSelectorProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="text-[10px] font-medium text-[var(--text-subtle)] uppercase tracking-wide shrink-0">
        Tone
      </span>
      {TONES.map((tone) => (
        <button
          key={tone.id}
          type="button"
          onClick={() => onChange(tone.id)}
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors",
            value === tone.id
              ? "bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]"
              : "bg-[var(--bg-muted)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-hover)]"
          )}
        >
          {tone.label}
        </button>
      ))}
    </div>
  );
}
