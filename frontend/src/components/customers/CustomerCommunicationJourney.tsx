import {
  CheckCircle2,
  Eye,
  MousePointerClick,
  Send,
  AlertTriangle,
  ShoppingBag,
  BookOpenCheck,
} from "lucide-react";
import { ChannelBadge } from "@/components/ui/Badge";
import { formatCurrency, formatRelativeDate, cn } from "@/lib/utils";
import type { CustomerCommunication } from "@/lib/api";

const EVENT_META: Record<
  string,
  { label: string; icon: typeof Send; color: string }
> = {
  sent: { label: "Sent", icon: Send, color: "text-[var(--accent)]" },
  delivered: { label: "Delivered", icon: CheckCircle2, color: "text-[var(--success)]" },
  failed: { label: "Failed", icon: AlertTriangle, color: "text-[var(--error)]" },
  opened: { label: "Opened", icon: Eye, color: "text-[var(--info)]" },
  read: { label: "Read", icon: BookOpenCheck, color: "text-[var(--channel-email-text)]" },
  clicked: { label: "Clicked", icon: MousePointerClick, color: "text-[var(--warning)]" },
};

const LIFECYCLE_ORDER = ["sent", "delivered", "opened", "read", "clicked", "failed"];

function sortEvents(events: CustomerCommunication["events"]) {
  return [...events].sort(
    (a, b) =>
      LIFECYCLE_ORDER.indexOf(a.eventType) - LIFECYCLE_ORDER.indexOf(b.eventType) ||
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

interface CustomerCommunicationJourneyProps {
  communications: CustomerCommunication[];
  loading?: boolean;
}

export function CustomerCommunicationJourney({
  communications,
  loading,
}: CustomerCommunicationJourneyProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-[var(--radius-sm)] bg-[var(--bg-muted)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] py-2">
        No campaign messages yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {communications.map((comm) => {
        const sorted = sortEvents(comm.events);
        const hasFailed = sorted.some((e) => e.eventType === "failed");

        return (
          <div
            key={comm.id}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
          >
            <div className="px-3 py-2.5 border-b border-[var(--border)] bg-[var(--bg-muted)] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {comm.campaignName}
                </p>
                <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                  {formatRelativeDate(comm.timestamp)}
                </p>
              </div>
              <ChannelBadge channel={comm.channel} />
            </div>

            <div className="px-3 py-3 space-y-0">
              {sorted.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Queued — not sent yet</p>
              ) : (
                sorted.map((evt, idx) => {
                  const meta = EVENT_META[evt.eventType] ?? EVENT_META.sent;
                  const Icon = meta.icon;
                  const isLast = idx === sorted.length - 1;

                  return (
                    <div key={`${evt.eventType}-${evt.timestamp}`} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center border",
                            evt.eventType === "failed"
                              ? "border-[var(--error-border)] bg-[var(--error-bg)]"
                              : "border-[var(--border)] bg-[var(--bg-muted)]"
                          )}
                        >
                          <Icon className={cn("w-3 h-3", meta.color)} />
                        </div>
                        {!isLast && (
                          <div className="w-px flex-1 min-h-[12px] bg-[var(--border)] my-0.5" />
                        )}
                      </div>
                      <div className={cn("pb-3", isLast && "pb-0")}>
                        <p className={cn("text-xs font-medium", meta.color)}>{meta.label}</p>
                        <p className="text-[10px] text-[var(--text-subtle)]">
                          {formatRelativeDate(evt.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              {comm.attributedOrderId && comm.attributedAmount != null && (
                <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] bg-[var(--success-bg)] border border-[var(--success-border)]">
                  <ShoppingBag className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                  <span className="text-xs font-medium text-[var(--success)]">
                    Order attributed · {formatCurrency(comm.attributedAmount)}
                  </span>
                </div>
              )}

              {hasFailed && !comm.attributedOrderId && (
                <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                  Delivery did not complete for this message
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
