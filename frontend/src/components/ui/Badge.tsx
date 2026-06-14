import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "outline" | "accent";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border)]",
  success: "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]",
  warning: "bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]",
  error: "bg-[var(--error-bg)] text-[var(--error)] border-[var(--error-border)]",
  info: "bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)]",
  outline: "bg-transparent text-[var(--text-muted)] border-[var(--border)]",
  accent: "bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)] border-[var(--badge-indigo-border)]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[var(--text-subtle)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  error: "bg-[var(--error)]",
  info: "bg-[var(--info)]",
  outline: "bg-[var(--text-subtle)]",
  accent: "bg-[var(--accent)]",
};

export function Badge({ children, variant = "default", className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

// ── Status badge helper ──
export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: BadgeVariant; label: string }> = {
    draft: { variant: "outline", label: "Draft" },
    scheduled: { variant: "info", label: "Scheduled" },
    active: { variant: "accent", label: "Active" },
    sending: { variant: "accent", label: "Sending" },
    completed: { variant: "success", label: "Completed" },
    failed: { variant: "error", label: "Failed" },
    sent: { variant: "info", label: "Sent" },
    delivered: { variant: "success", label: "Delivered" },
    opened: { variant: "success", label: "Opened" },
    clicked: { variant: "success", label: "Clicked" },
  };
  const config = variants[status] || { variant: "default" as BadgeVariant, label: status };

  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

// ── Channel badge ──
const channelConfig: Record<string, { color: string; label: string }> = {
  whatsapp: {
    color: "bg-[var(--channel-whatsapp-bg)] text-[var(--channel-whatsapp-text)] border-[var(--channel-whatsapp-border)]",
    label: "WhatsApp",
  },
  sms: {
    color: "bg-[var(--channel-sms-bg)] text-[var(--channel-sms-text)] border-[var(--channel-sms-border)]",
    label: "SMS",
  },
  email: {
    color: "bg-[var(--channel-email-bg)] text-[var(--channel-email-text)] border-[var(--channel-email-border)]",
    label: "Email",
  },
  rcs: {
    color: "bg-[var(--channel-rcs-bg)] text-[var(--channel-rcs-text)] border-[var(--channel-rcs-border)]",
    label: "RCS",
  },
};

export function ChannelBadge({ channel }: { channel: string }) {
  const config = channelConfig[channel] || { color: "", label: channel };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border", config.color)}>
      {config.label}
    </span>
  );
}
