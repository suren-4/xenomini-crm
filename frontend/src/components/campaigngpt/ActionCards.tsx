import { useEffect, useState } from "react";
import {
  Users,
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  Loader2,
  Check,
  Send,
  Eye,
  MousePointerClick,
  CheckCircle2,
} from "lucide-react";
import { api, type Campaign, type Customer } from "@/lib/api";
import {
  formatConditionPill,
  segmentActionToRules,
  filterCustomersByActionFilters,
  type AgentAction,
  type GPTCondition,
} from "@/lib/campaignGPT";
import { filterCustomersByRules } from "@/lib/segments";
import { formatNumber } from "@/lib/utils";

export type CardLaunchState = "idle" | "loading" | "success" | "error";

interface SegmentActionCardProps {
  action: AgentAction;
  launchState: CardLaunchState;
  onCreate: () => void;
  onModify: () => void;
}

export function SegmentActionCard({
  action,
  launchState,
  onCreate,
  onModify,
}: SegmentActionCardProps) {
  const segment = action.segment as {
    name: string;
    rules?: { conditions?: GPTCondition[] };
    description?: string;
  };
  const [count, setCount] = useState<number | null>(null);
  const conditions = segment?.rules?.conditions ?? [];

  useEffect(() => {
    let cancelled = false;
    const { rules, ruleLogic } = segmentActionToRules(segment);
    api.getCustomers().then((customers) => {
      if (cancelled) return;
      setCount(filterCustomersByRules(customers, rules, ruleLogic).length);
    });
    return () => {
      cancelled = true;
    };
  }, [segment]);

  return (
    <div className="w-full mt-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--accent-muted)]">
        <div className="flex items-center gap-1.5">
          <Users className="w-3 h-3 text-[var(--accent)]" />
          <span className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wide">
            Segment Proposal
          </span>
        </div>
        <p className="text-[12px] font-semibold text-[var(--text-primary)] mt-1">
          {segment.name}
        </p>
        {segment.description && (
          <p className="text-[10px] text-[var(--text-muted)] mt-1">{segment.description}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {conditions.map((c, i) => (
            <span
              key={i}
              className="bg-[var(--bg-muted)] border border-[var(--border)] rounded-full px-2 py-0.5 text-[10px] text-[var(--text-muted)]"
            >
              {formatConditionPill(c)}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
          Estimated:{" "}
          <span className="font-bold text-[var(--accent)]">
            {count == null ? "..." : `${count} customers`}
          </span>
        </p>
      </div>
      <div className="px-3 py-2.5 flex gap-2">
        <button
          onClick={onModify}
          disabled={launchState === "loading" || launchState === "success"}
          className="flex-1 h-[30px] bg-transparent border border-[var(--border)] rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          Modify
        </button>
        <button
          onClick={onCreate}
          disabled={launchState === "loading" || launchState === "success"}
          className={`flex-1 h-[30px] rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 ${
            launchState === "success"
              ? "bg-emerald-500 text-white"
              : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)]"
          }`}
        >
          {launchState === "loading" && <Loader2 className="w-3 h-3 animate-spin" />}
          {launchState === "success" && <Check className="w-3 h-3" />}
          {launchState === "loading"
            ? "Creating..."
            : launchState === "success"
              ? "Created"
              : "Create Segment"}
        </button>
      </div>
    </div>
  );
}

interface FindCustomersCardProps {
  action: AgentAction;
  onViewAll: (filters: Record<string, unknown>) => void;
  onQuickReply: (text: string) => void;
}

export function FindCustomersCard({ action, onViewAll, onQuickReply }: FindCustomersCardProps) {
  const filters = (action.filters ?? {}) as {
    minSpend?: number | null;
    maxSpend?: number | null;
    city?: string | null;
    minOrders?: number | null;
    inactiveDays?: number | null;
  };
  const description = (action.description as string) ?? "Matching customers";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getCustomers({
        city: filters.city ?? undefined,
        minSpend: filters.minSpend ?? undefined,
        maxSpend: filters.maxSpend ?? undefined,
      })
      .then((data) => {
        if (cancelled) return;
        setCustomers(filterCustomersByActionFilters(data, filters));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [action]);

  return (
    <div className="w-full mt-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <Search className="w-3 h-3 text-[var(--accent)]" />
          <span className="text-[10px] font-semibold text-[var(--accent)] uppercase">Customer Search</span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">{description}</p>
        <p className="text-[12px] font-bold text-[var(--text-primary)] mt-1">
          {loading ? "Searching..." : `${customers.length} customers match`}
        </p>
      </div>
      {!loading && customers.length > 0 && (
        <div className="px-3 py-2 space-y-1.5">
          {customers.slice(0, 3).map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 bg-[var(--bg-hover)] rounded-lg px-3 py-2"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] text-[10px] font-bold flex items-center justify-center shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                  {c.name}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {c.city} · {formatNumber(c.totalSpend)} spent
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="px-3 py-2 border-t border-[var(--border)] space-y-1.5">
        <button
          onClick={() => onViewAll(filters)}
          className="w-full text-[11px] text-[var(--accent)] hover:opacity-80 font-medium"
        >
          View all {customers.length} customers
        </button>
        <button
          onClick={() => onQuickReply("Create a campaign for these customers")}
          className="w-full text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)]"
        >
          Create a campaign for these customers?
        </button>
      </div>
    </div>
  );
}

interface AnalyticsInsightCardProps {
  action: AgentAction;
  onViewAnalytics: () => void;
}

export function AnalyticsInsightCard({ action, onViewAnalytics }: AnalyticsInsightCardProps) {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof api.getDashboard>> | null>(
    null
  );

  useEffect(() => {
    api.getDashboard().then(setDashboard).catch(() => setDashboard(null));
  }, []);

  const trend = (action.trend as string) ?? "neutral";
  const highlightValue =
    (action.highlightValue as string) ??
    (dashboard ? String(dashboard.funnel.delivered) : "—");
  const highlightLabel = (action.highlightLabel as string) ?? "Delivered";
  const insight = (action.insight as string) ?? "Marketing performance overview";

  return (
    <div className="w-full mt-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="w-3 h-3 text-[var(--accent)]" />
          <span className="text-[10px] font-semibold text-[var(--accent)] uppercase">
            Analytics Insight
          </span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-[var(--text-primary)]">{highlightValue}</span>
          {trend === "up" && <TrendingUp className="w-4 h-4 text-[var(--success)] mb-1" />}
          {trend === "down" && <TrendingDown className="w-4 h-4 text-[var(--error)] mb-1" />}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
          {highlightLabel}
        </p>
        <p className="text-[11px] text-[var(--text-primary)] mt-2 leading-relaxed">{insight}</p>
        {dashboard && (
          <div className="mt-2 grid grid-cols-4 gap-1 text-center">
            {[
              { l: "Sent", v: dashboard.funnel.sent },
              { l: "Deliv", v: dashboard.funnel.delivered },
              { l: "Open", v: dashboard.funnel.opened },
              { l: "Click", v: dashboard.funnel.clicked },
            ].map((m) => (
              <div key={m.l} className="bg-[var(--bg-hover)] rounded-lg py-1.5">
                <p className="text-[10px] font-bold">{m.v}</p>
                <p className="text-[9px] text-[var(--text-muted)]">{m.l}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-[var(--border)]">
        <button
          onClick={onViewAnalytics}
          className="w-full text-[11px] text-[var(--accent)] hover:opacity-80 font-medium"
        >
          View full analytics
        </button>
      </div>
    </div>
  );
}

interface CustomerAnalysisCardProps {
  action: AgentAction;
}

export function CustomerAnalysisCard({ action }: CustomerAnalysisCardProps) {
  const analysis = action.analysis as {
    title?: string;
    insights?: {
      label: string;
      value: string;
      trend?: string;
      description?: string;
    }[];
  };

  return (
    <div className="w-full mt-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <span className="text-[10px] font-semibold text-[var(--accent)] uppercase">
          Customer Analysis
        </span>
        {analysis?.title && (
          <p className="text-[12px] font-semibold text-[var(--text-primary)] mt-1">
            {analysis.title}
          </p>
        )}
      </div>
      <div className="divide-y divide-[var(--border)]">
        {(analysis?.insights ?? []).map((insight) => (
          <div key={insight.label} className="px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] text-[var(--text-muted)]">{insight.label}</p>
                {insight.description && (
                  <p className="text-[10px] text-[var(--text-subtle)]">{insight.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[12px] font-bold text-[var(--text-primary)]">
                {insight.value}
              </span>
              {insight.trend === "up" && (
                <TrendingUp className="w-3 h-3 text-[var(--success)]" />
              )}
              {insight.trend === "down" && (
                <TrendingDown className="w-3 h-3 text-[var(--error)]" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CampaignStatsCardProps {
  action: AgentAction;
}

export function CampaignStatsCard({ action }: CampaignStatsCardProps) {
  const campaignName = (action.campaignName as string) ?? "";
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getCampaigns()
      .then((list) => {
        if (cancelled) return;
        const match =
          list.find((c) => c.name.toLowerCase() === campaignName.toLowerCase()) ??
          list.find((c) => c.name.toLowerCase().includes(campaignName.toLowerCase())) ??
          list[0];
        setCampaign(match ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignName]);

  if (loading) {
    return (
      <div className="w-full mt-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] px-3 py-4 text-[11px] text-[var(--text-muted)]">
        Loading campaign stats...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="w-full mt-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] px-3 py-4 text-[11px] text-[var(--text-muted)]">
        No matching campaign found for "{campaignName}".
      </div>
    );
  }

  const deliveryRate =
    campaign.stats.sent > 0
      ? Math.round((campaign.stats.delivered / campaign.stats.sent) * 100)
      : 0;

  return (
    <div className="w-full mt-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] flex justify-between items-start">
        <p className="text-[12px] font-semibold text-[var(--text-primary)]">{campaign.name}</p>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] capitalize">
          {campaign.channel}
        </span>
      </div>
      <div className="px-3 py-2.5 grid grid-cols-2 gap-2">
        {[
          { icon: Send, label: "Sent", value: campaign.stats.sent },
          { icon: CheckCircle2, label: "Delivered", value: campaign.stats.delivered },
          { icon: Eye, label: "Opened", value: campaign.stats.opened },
          { icon: MousePointerClick, label: "Clicked", value: campaign.stats.clicked },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--bg-hover)] rounded-xl p-3">
            <m.icon className="w-3 h-3 text-[var(--text-muted)] mb-1" />
            <p className="text-lg font-bold text-[var(--text-primary)]">{formatNumber(m.value)}</p>
            <p className="text-[10px] text-[var(--text-subtle)]">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
          <span>Delivery Rate</span>
          <span>{deliveryRate}%</span>
        </div>
        <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all"
            style={{ width: `${deliveryRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function QuickReplyChips({
  replies,
  onSelect,
}: {
  replies: string[];
  onSelect: (text: string) => void;
}) {
  if (!replies.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {replies.map((reply) => (
        <button
          key={reply}
          type="button"
          onClick={() => onSelect(reply)}
          className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-full px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] transition-all duration-150"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
