import { useMemo } from "react";
import {
  Users,
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  FileEdit,
  Clock,
  BookOpenCheck,
  ShoppingBag,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { ChannelBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MessagePreview } from "@/components/campaigns/MessagePreview";
import { CampaignLiveEventFeed } from "@/components/campaigns/CampaignLiveEventFeed";
import { useCampaignEventStream } from "@/hooks/useCampaignEventStream";
import { formatNumber, formatRelativeDate, cn } from "@/lib/utils";
import type { Campaign } from "@/lib/api";

const TIMELINE_STEPS = [
  { key: "draft", label: "Draft", icon: FileEdit },
  { key: "queued", label: "Queued", icon: Clock },
  { key: "sent", label: "Sent", icon: Send },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
  { key: "opened", label: "Opened", icon: Eye },
  { key: "read", label: "Read", icon: BookOpenCheck },
  { key: "clicked", label: "Clicked", icon: MousePointerClick },
] as const;

type TimelineKey = (typeof TIMELINE_STEPS)[number]["key"];

function getTimelineSteps(campaign: Campaign) {
  if (campaign.stats.read > 0) return TIMELINE_STEPS;
  return TIMELINE_STEPS.filter((s) => s.key !== "read");
}

function getTimelineProgress(campaign: Campaign): { completed: Set<TimelineKey>; current: TimelineKey } {
  const completed = new Set<TimelineKey>(["draft"]);
  const { status, stats } = campaign;

  if (status === "sending" || status === "scheduled" || stats.sent > 0 || stats.total > 0) {
    completed.add("queued");
  }
  if (stats.sent > 0) completed.add("sent");
  if (stats.delivered > 0) completed.add("delivered");
  if (stats.opened > 0) completed.add("opened");
  if (stats.read > 0) completed.add("read");
  if (stats.clicked > 0) completed.add("clicked");

  let current: TimelineKey = "draft";
  if (status === "draft") current = "draft";
  else if (status === "sending" || status === "scheduled") current = "queued";
  else if (stats.clicked > 0) current = "clicked";
  else if (stats.read > 0) current = "read";
  else if (stats.opened > 0) current = "opened";
  else if (stats.delivered > 0) current = "delivered";
  else if (stats.sent > 0) current = "sent";
  else if (stats.total > 0) current = "queued";
  else current = "draft";

  return { completed, current };
}

function CampaignTimeline({ campaign }: { campaign: Campaign }) {
  const { completed, current } = getTimelineProgress(campaign);
  const steps = getTimelineSteps(campaign);

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const isCompleted = completed.has(step.key);
        const isCurrent = current === step.key;
        const Icon = step.icon;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors",
                  isCompleted
                    ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--text-on-accent)]"
                    : isCurrent
                      ? "bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent)]"
                      : "bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-subtle)]"
                )}
              >
                {isCurrent && !isCompleted ? (
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px] my-1",
                    isCompleted ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-5", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  isCompleted || isCurrent ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]"
                )}
              >
                {step.label}
              </p>
              {isCurrent && (
                <p className="text-xs text-[var(--accent)] mt-0.5">
                  {step.key === "draft" && campaign.status === "draft" ? "Ready to launch" : "In progress"}
                </p>
              )}
              {isCompleted && step.key === "sent" && campaign.sentAt && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatRelativeDate(campaign.sentAt)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeliveryStats({ campaign }: { campaign: Campaign }) {
  const { stats } = campaign;
  const safeSent = stats.sent || 1;

  const items = [
    { label: "Sent", value: stats.sent, pct: 100, icon: Send, color: "text-[var(--accent)]" },
    {
      label: "Delivered",
      value: stats.delivered,
      pct: Math.round((stats.delivered / safeSent) * 100),
      icon: CheckCircle2,
      color: "text-[var(--success)]",
    },
    {
      label: "Opened",
      value: stats.opened,
      pct: stats.sent ? Math.round((stats.opened / safeSent) * 100) : 0,
      icon: Eye,
      color: "text-[var(--info)]",
    },
    {
      label: "Read",
      value: stats.read,
      pct: stats.sent ? Math.round((stats.read / safeSent) * 100) : 0,
      icon: BookOpenCheck,
      color: "text-[var(--channel-email-text)]",
    },
    {
      label: "Clicked",
      value: stats.clicked,
      pct: stats.sent ? Math.round((stats.clicked / safeSent) * 100) : 0,
      icon: MousePointerClick,
      color: "text-[var(--warning)]",
    },
    {
      label: "Failed",
      value: stats.failed,
      pct: stats.sent ? Math.round((stats.failed / safeSent) * 100) : 0,
      icon: AlertTriangle,
      color: "text-[var(--error)]",
    },
    {
      label: "Orders attributed",
      value: stats.attributed,
      pct: stats.sent ? Math.round((stats.attributed / safeSent) * 100) : 0,
      icon: ShoppingBag,
      color: "text-[var(--success)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-muted)] p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={cn("w-3.5 h-3.5", item.color)} />
              <span className="text-xs font-medium text-[var(--text-muted)]">{item.label}</span>
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{formatNumber(item.value)}</p>
            {stats.sent > 0 && (
              <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">{item.pct}% of sent</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface CampaignDetailDrawerProps {
  campaign: Campaign | null;
  audienceSize: number;
  open: boolean;
  onClose: () => void;
  onSend?: (campaign: Campaign) => void;
  sending?: boolean;
}

export function CampaignDetailDrawer({
  campaign,
  audienceSize,
  open,
  onClose,
  onSend,
  sending,
}: CampaignDetailDrawerProps) {
  const displayAudience = useMemo(() => {
    if (!campaign) return 0;
    return campaign.stats.total > 0 ? campaign.stats.total : audienceSize;
  }, [campaign, audienceSize]);

  const streamEnabled =
    !!campaign && (campaign.status === "sending" || campaign.status === "completed");
  const { events: streamEvents, live } = useCampaignEventStream(
    campaign?.id ?? null,
    streamEnabled
  );

  if (!campaign) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Campaign Details" width="w-[520px] max-w-[100vw]">
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight">{campaign.name}</h2>
            <StatusBadge status={campaign.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChannelBadge channel={campaign.channel} />
            <span className="text-xs text-[var(--text-muted)]">
              Created {formatRelativeDate(campaign.createdAt)}
            </span>
          </div>
        </div>

        {/* Segment & Audience */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-muted)] p-3">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Segment</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{campaign.segmentName}</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-muted)] p-3">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Audience Size
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{formatNumber(displayAudience)}</p>
          </div>
        </div>

        {/* Message Preview */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Message Preview</h3>
          <MessagePreview
            channel={campaign.channel}
            message={campaign.message}
            campaignName={campaign.name}
          />
        </div>

        {/* Delivery Statistics */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Delivery Statistics</h3>
          {campaign.status === "draft" ? (
            <p className="text-sm text-[var(--text-muted)] rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-4 text-center">
              Stats will appear after the campaign is sent.
            </p>
          ) : (
            <DeliveryStats campaign={campaign} />
          )}
        </div>

        {/* Live callback feed */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Live callback feed
          </h3>
          <CampaignLiveEventFeed
            events={streamEvents}
            live={live}
            campaignStatus={campaign.status}
          />
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Timeline</h3>
          <CampaignTimeline campaign={campaign} />
        </div>

        {/* Actions */}
        {campaign.status === "draft" && onSend && (
          <Button
            className="w-full"
            leftIcon={<Send className="w-4 h-4" />}
            onClick={() => onSend(campaign)}
            disabled={sending}
          >
            {sending ? "Sending..." : `Send to ${formatNumber(displayAudience)} customers`}
          </Button>
        )}
      </div>
    </Drawer>
  );
}
