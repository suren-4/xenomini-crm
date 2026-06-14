import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users,
  Megaphone,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { StatusBadge, ChannelBadge } from "@/components/ui/Badge";
import { PageHeader, PageHeaderSkeleton } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { formatNumber, formatRelativeDate, formatCurrency, cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { useFetch } from "@/hooks/useFetch";
import { api, type Campaign, type DashboardData } from "@/lib/api";
import { buildAiRecommendations } from "@/lib/aiRecommendations";
import { AiRecommendationsPanel } from "@/components/dashboard/AiRecommendationCard";
import { CampaignDetailDrawer } from "@/components/campaigns/CampaignDetailDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAgentContext } from "@/context/AgentContext";
import type { ReactNode } from "react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

const FUNNEL_STEPS = [
  { key: "sent", label: "Sent", color: "bg-[var(--accent)]" },
  { key: "delivered", label: "Delivered", color: "bg-[var(--info)]" },
  { key: "opened", label: "Opened", color: "bg-[var(--success)]" },
  { key: "clicked", label: "Clicked", color: "bg-[var(--warning)]" },
] as const;

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const chartData = data.map((value, index) => ({ value, index }));
  return (
    <div className="w-full h-12 opacity-90">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={positive ? "var(--success)" : "var(--error)"}
            strokeWidth={2}
            dot={false}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendBadge({ trend }: { trend: number }) {
  const positive = trend >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
        positive ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--error-bg)] text-[var(--error)]"
      )}
    >
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? "+" : ""}
      {trend}%
    </span>
  );
}

function BentoKpiCard({
  label,
  value,
  trend,
  icon,
  className,
  large,
}: {
  label: ReactNode;
  value: ReactNode;
  trend?: number;
  icon: ReactNode;
  className?: string;
  large?: boolean;
}) {
  return (
    <Card hover className={cn("flex flex-col justify-between h-full", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
          <p
            className={cn(
              "font-bold text-[var(--text-primary)] tracking-tight mt-2",
              large ? "text-4xl lg:text-5xl" : "text-3xl"
            )}
          >
            {value}
          </p>
          {trend !== undefined && (
            <div className="mt-2">
              <TrendBadge trend={trend} />
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] shrink-0">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function HeroRevenueCard({ dashboard }: { dashboard: DashboardData }) {
  const animatedRevenue = useCountUp(dashboard.revenueInfluenced);
  const positive = dashboard.revenueTrend >= 0;

  return (
    <Card
      hover
      className="lg:col-span-6 lg:row-span-2 relative overflow-hidden flex flex-col justify-between min-h-[220px] h-full"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-muted)] via-transparent to-transparent pointer-events-none" />
      <div className="relative flex flex-col h-full justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Total Revenue Influenced
          </p>
          <p className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] tracking-tight mt-3">
            {formatCurrency(animatedRevenue)}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Attributed orders from campaign engagement
          </p>
          <div className="mt-3">
            <TrendBadge trend={dashboard.revenueTrend} />
            <span className="text-xs text-[var(--text-subtle)] ml-2">vs prior period</span>
          </div>
        </div>
        <div className="relative">
          <p className="text-[10px] font-medium text-[var(--text-subtle)] uppercase tracking-wide mb-1">
            12-day trend
          </p>
          <MiniSparkline data={dashboard.sparklines.revenue} positive={positive} />
        </div>
      </div>
    </Card>
  );
}

function CommunicationFunnel({ funnel }: { funnel: DashboardData["funnel"] }) {
  const safeSent = funnel.sent || 1;

  return (
    <Card hover className="h-full">
      <CardHeader title="Communication Funnel" description="Message journey across all channels" />
      <div className="space-y-4">
        {FUNNEL_STEPS.map((step, idx) => {
          const value = funnel[step.key];
          const percent = Math.round((value / safeSent) * 100);
          const width = Math.max((value / safeSent) * 100, value > 0 ? 3 : 0);

          return (
            <div key={step.key}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-[var(--text-primary)]">{step.label}</span>
                <span className="text-[var(--text-muted)] tabular-nums">
                  {formatNumber(value)} · {percent}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-[var(--bg-muted)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.7, delay: idx * 0.08, ease: "easeOut" }}
                  className={cn("h-full rounded-full", step.color)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RecentCampaignsTable({
  campaigns,
  onSelect,
}: {
  campaigns: Campaign[];
  onSelect: (campaign: Campaign) => void;
}) {
  const recent = [...campaigns]
    .sort((a, b) => new Date(b.sentAt ?? b.createdAt).getTime() - new Date(a.sentAt ?? a.createdAt).getTime())
    .slice(0, 6);

  return (
    <Card padding={false} hover className="overflow-hidden">
      <div className="px-[var(--card-padding)] py-[var(--space-4)] border-b border-[var(--border)] flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Campaigns</h3>
          <p className="text-sm text-[var(--text-muted)]">Latest outreach across all channels</p>
        </div>
        <Link
          to="/campaigns"
          className="text-sm text-[var(--accent)] hover:opacity-80 font-medium flex items-center gap-1 shrink-0"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-muted)] text-[var(--text-muted)] border-b border-[var(--border)]">
            <tr>
              {["Campaign", "Segment", "Channel", "Status", "Sent", "Date"].map((h) => (
                <th
                  key={h}
                  className="px-[var(--space-6)] h-[var(--table-header-height)] text-xs font-semibold uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-muted)]">
            {recent.map((c) => (
              <tr
                key={c.id}
                onClick={() => onSelect(c)}
                className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <td className="px-[var(--space-6)] h-[var(--table-row-height)] font-medium text-[var(--text-primary)]">
                  {c.name}
                </td>
                <td className="px-[var(--space-6)] h-[var(--table-row-height)] text-[var(--text-muted)]">
                  {c.segmentName}
                </td>
                <td className="px-[var(--space-6)] h-[var(--table-row-height)]">
                  <ChannelBadge channel={c.channel} />
                </td>
                <td className="px-[var(--space-6)] h-[var(--table-row-height)]">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-[var(--space-6)] h-[var(--table-row-height)] font-medium tabular-nums">
                  {formatNumber(c.stats.sent)}
                </td>
                <td className="px-[var(--space-6)] h-[var(--table-row-height)] text-[var(--text-muted)]">
                  {c.sentAt ? formatRelativeDate(c.sentAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-[var(--page-gap)]">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-12 gap-[var(--space-4)]">
        <div className="col-span-12 lg:col-span-6 lg:row-span-2">
          <StatCardSkeleton />
        </div>
        <div className="col-span-6 lg:col-span-3"><StatCardSkeleton /></div>
        <div className="col-span-6 lg:col-span-3"><StatCardSkeleton /></div>
        <div className="col-span-12 lg:col-span-6"><StatCardSkeleton /></div>
        <div className="col-span-12 lg:col-span-4"><StatCardSkeleton /></div>
        <div className="col-span-12 lg:col-span-8"><StatCardSkeleton /></div>
        <div className="col-span-12"><TableSkeleton rows={5} cols={6} /></div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: dashboard, loading: dashLoading, error: dashError } = useFetch(
    () => api.getDashboard(),
    { cacheKey: "dashboard" }
  );
  const { data: campaigns, refetch: refetchCampaigns } = useFetch(() => api.getCampaigns(), {
    cacheKey: "campaigns",
  });
  const { data: segments } = useFetch(() => api.getSegments(), { cacheKey: "segments" });
  const { data: customers, loading: customersLoading } = useFetch(() => api.getCustomers(), {
    cacheKey: "customers",
  });
  const { data: analytics, loading: analyticsLoading } = useFetch(() => api.getAnalytics(30), {
    cacheKey: "analytics:30",
  });
  const { selectedCampaign, setSelectedCampaign } = useAgentContext();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState<Campaign | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const CHANNEL_LABELS: Record<string, string> = {
    whatsapp: "WhatsApp",
    sms: "SMS",
    email: "Email",
    rcs: "RCS",
  };

  const aiRecommendations = useMemo(
    () =>
      buildAiRecommendations(
        customers ?? [],
        analytics,
        segments ?? [],
        campaigns ?? []
      ),
    [customers, analytics, segments, campaigns]
  );

  const getAudienceSize = (segmentId: string) =>
    (segments ?? []).find((s) => s.id === segmentId)?.customerCount ?? 0;

  const customerCount = useCountUp(dashboard?.totalCustomers ?? 0);
  const activeCampaigns = useCountUp(dashboard?.activeCampaigns ?? 0);

  const hasSendingCampaigns = (campaigns ?? []).some((c) => c.status === "sending");

  useEffect(() => {
    if (!hasSendingCampaigns) return;
    const interval = setInterval(() => refetchCampaigns({ silent: true }), 3000);
    return () => clearInterval(interval);
  }, [hasSendingCampaigns, refetchCampaigns]);

  useEffect(() => {
    if (!selectedCampaign || !campaigns) return;
    const updated = campaigns.find((c) => c.id === selectedCampaign.id);
    if (updated) setSelectedCampaign(updated);
  }, [campaigns, selectedCampaign, setSelectedCampaign]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const requestSend = (campaign: Campaign) => {
    if (campaign.status !== "draft") return;
    setConfirmSend(campaign);
  };

  const executeSend = async () => {
    if (!confirmSend || confirmSend.status !== "draft") return;
    const campaign = confirmSend;
    setSendingId(campaign.id);
    try {
      const result = await api.sendCampaign(campaign.id);
      setToastMessage(`Sending ${result.count} messages — status updates automatically.`);
      setConfirmSend(null);
      refetchCampaigns({ silent: true });
    } catch (e) {
      setToastMessage(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSendingId(null);
    }
  };

  if (dashLoading && !dashboard) return <DashboardSkeleton />;

  if (dashError || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-[var(--error)]">Failed to load dashboard</p>
        <p className="text-sm text-[var(--text-muted)]">{dashError}</p>
        <p className="text-xs text-[var(--text-subtle)]">Make sure backend is running on port 3000</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-[var(--page-gap)]">
      <PageHeader
        title="Dashboard"
        description="Welcome back — here's your marketing performance at a glance."
      />

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-[var(--space-4)] auto-rows-min">
        {/* 1. Hero KPI — Revenue */}
        <motion.div variants={item} className="col-span-12 lg:col-span-6 lg:row-span-2">
          <HeroRevenueCard dashboard={dashboard} />
        </motion.div>

        {/* 2. Customer KPI */}
        <motion.div variants={item} className="col-span-6 lg:col-span-3">
          <BentoKpiCard
            label="Total Customers"
            value={customerCount.toLocaleString("en-IN")}
            trend={dashboard.customersTrend}
            icon={<Users className="w-5 h-5" />}
          />
        </motion.div>

        {/* 3. Campaign KPI */}
        <motion.div variants={item} className="col-span-6 lg:col-span-3">
          <BentoKpiCard
            label={
              <span className="flex items-center gap-1.5">
                Active Campaigns
                {dashboard.activeCampaigns > 0 && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--success)]" />
                  </span>
                )}
              </span>
            }
            value={activeCampaigns.toLocaleString("en-IN")}
            trend={dashboard.campaignsTrend}
            icon={<Megaphone className="w-5 h-5" />}
          />
        </motion.div>

        {/* 4. Communication KPI — Delivered % */}
        <motion.div variants={item} className="col-span-12 lg:col-span-6">
          <BentoKpiCard
            label="Delivered"
            value={
              <span>
                {dashboard.deliveryRate}
                <span className="text-2xl text-[var(--text-muted)]">%</span>
              </span>
            }
            trend={dashboard.messagesTrend}
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
        </motion.div>

        {/* AI Recommendations (30%) + Communication Funnel (70%) */}
        <motion.div variants={item} className="col-span-12 grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-[var(--space-4)]">
          <AiRecommendationsPanel
            recommendations={aiRecommendations}
            loading={customersLoading || analyticsLoading}
          />
          <CommunicationFunnel funnel={dashboard.funnel} />
        </motion.div>

        {/* Recent Campaigns */}
        <motion.div variants={item} className="col-span-12">
          <RecentCampaignsTable
            campaigns={campaigns ?? []}
            onSelect={setSelectedCampaign}
          />
        </motion.div>
      </div>

      <CampaignDetailDrawer
        campaign={selectedCampaign}
        audienceSize={selectedCampaign ? getAudienceSize(selectedCampaign.segmentId) : 0}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onSend={requestSend}
        sending={selectedCampaign ? sendingId === selectedCampaign.id : false}
      />

      <ConfirmDialog
        open={!!confirmSend}
        title="Send campaign?"
        message={
          confirmSend
            ? `Send this campaign to ${formatNumber(getAudienceSize(confirmSend.segmentId))} customers via ${CHANNEL_LABELS[confirmSend.channel] ?? confirmSend.channel}?`
            : ""
        }
        confirmLabel="Send now"
        variant="warning"
        loading={!!sendingId}
        onConfirm={executeSend}
        onCancel={() => setConfirmSend(null)}
      />

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--text-primary)] text-[var(--bg-card)] px-4 py-2.5 rounded-lg shadow-[var(--shadow-lg)] text-sm font-medium">
          {toastMessage}
        </div>
      )}
    </motion.div>
  );
}
