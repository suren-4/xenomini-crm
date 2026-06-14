import { Radio, ShoppingBag } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { CampaignStreamEvent } from "@/lib/api";

const EVENT_STYLES: Record<string, { label: string; dot: string; text: string }> = {
  sent: { label: "Sent", dot: "bg-[var(--accent)]", text: "text-[var(--accent)]" },
  delivered: { label: "Delivered", dot: "bg-[var(--success)]", text: "text-[var(--success)]" },
  failed: { label: "Failed", dot: "bg-[var(--error)]", text: "text-[var(--error)]" },
  opened: { label: "Opened", dot: "bg-[var(--info)]", text: "text-[var(--info)]" },
  read: { label: "Read", dot: "bg-[var(--channel-email-text)]", text: "text-[var(--channel-email-text)]" },
  clicked: { label: "Clicked", dot: "bg-[var(--warning)]", text: "text-[var(--warning)]" },
  attributed: { label: "Order attributed", dot: "bg-[var(--success)]", text: "text-[var(--success)]" },
};

interface CampaignLiveEventFeedProps {
  events: CampaignStreamEvent[];
  live: boolean;
  campaignStatus: string;
}

export function CampaignLiveEventFeed({
  events,
  live,
  campaignStatus,
}: CampaignLiveEventFeedProps) {
  if (campaignStatus === "draft") {
    return (
      <p className="text-sm text-[var(--text-muted)] rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-4 text-center">
        Live callback feed starts when you send this campaign.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">
          Channel service callbacks as they arrive
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border",
            live
              ? "text-[var(--success)] border-[var(--success-border)] bg-[var(--success-bg)]"
              : "text-[var(--text-subtle)] border-[var(--border)] bg-[var(--bg-muted)]"
          )}
        >
          <Radio className={cn("w-3 h-3", live && "animate-pulse")} />
          {live ? "Live" : campaignStatus === "sending" ? "Connecting…" : "History"}
        </span>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-muted)] divide-y divide-[var(--border)]">
        {events.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] p-4 text-center">
            {campaignStatus === "sending"
              ? "Waiting for channel callbacks…"
              : "No events recorded yet."}
          </p>
        ) : (
          events.map((evt, idx) => {
            const style = EVENT_STYLES[evt.eventType ?? ""] ?? {
              label: evt.eventType ?? "Event",
              dot: "bg-[var(--text-subtle)]",
              text: "text-[var(--text-muted)]",
            };
            const isAttributed = evt.eventType === "attributed" || evt.attributed;

            return (
              <div
                key={`${evt.communicationId}-${evt.eventType}-${evt.timestamp}-${idx}`}
                className="flex items-start gap-2.5 px-3 py-2.5 text-xs"
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1", style.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("font-semibold", style.text)}>{style.label}</span>
                    {isAttributed && (
                      <ShoppingBag className="w-3 h-3 text-[var(--success)]" />
                    )}
                    <span className="text-[var(--text-subtle)]">·</span>
                    <span className="text-[var(--text-primary)] font-medium truncate">
                      {evt.customerName ?? "Customer"}
                    </span>
                  </div>
                  <p className="text-[var(--text-subtle)] mt-0.5">
                    {formatRelativeDate(evt.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
