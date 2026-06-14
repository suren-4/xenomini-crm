import { useState, useMemo, type ReactNode, type ComponentType } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import {
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Download,
  MessageCircle,
  Smartphone,
  Mail,
  Radio,
  Calendar,
  BookOpenCheck,
  ShoppingBag,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api, type AnalyticsData, type FunnelStats } from "@/lib/api";
import { PageHeader, PageHeaderSkeleton } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChartSkeleton, StatCardSkeleton } from "@/components/ui/Skeleton";
import { formatNumber, cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const DATE_RANGES = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
] as const;

const CHANNELS = [
  { id: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle, color: "var(--chart-whatsapp)" },
  { id: "sms" as const, label: "SMS", icon: Smartphone, color: "var(--chart-sms)" },
  { id: "email" as const, label: "Email", icon: Mail, color: "var(--chart-email)" },
  { id: "rcs" as const, label: "RCS", icon: Radio, color: "var(--chart-rcs)" },
];

const FUNNEL_STEPS = [
  { key: "sent" as const, label: "Sent", color: "bg-[var(--accent)]" },
  { key: "delivered" as const, label: "Delivered", color: "bg-[var(--info)]" },
  { key: "opened" as const, label: "Opened", color: "bg-[var(--success)]" },
  { key: "read" as const, label: "Read", color: "bg-[var(--chart-violet)]" },
  { key: "clicked" as const, label: "Clicked", color: "bg-[var(--warning)]" },
  { key: "failed" as const, label: "Failed", color: "bg-[var(--error)]" },
];

const METRIC_TILES = [
  { key: "sent" as const, label: "Sent", icon: Send, color: "text-[var(--accent)]", bg: "bg-[var(--accent-muted)]", barColor: "bg-[var(--accent)]" },
  { key: "delivered" as const, label: "Delivered", icon: CheckCircle2, color: "text-[var(--success)]", bg: "bg-[var(--success-bg)]", barColor: "bg-[var(--success)]" },
  { key: "opened" as const, label: "Opened", icon: Eye, color: "text-[var(--info)]", bg: "bg-[var(--info-bg)]", barColor: "bg-[var(--info)]" },
  { key: "read" as const, label: "Read", icon: BookOpenCheck, color: "text-[var(--chart-violet)]", bg: "bg-[var(--channel-email-bg)]", barColor: "bg-[var(--chart-violet)]" },
  { key: "clicked" as const, label: "Clicked", icon: MousePointerClick, color: "text-[var(--warning)]", bg: "bg-[var(--warning-bg)]", barColor: "bg-[var(--warning)]" },
  { key: "failed" as const, label: "Failed", icon: AlertTriangle, color: "text-[var(--error)]", bg: "bg-[var(--error-bg)]", barColor: "bg-[var(--error)]" },
];

const EMPTY_FUNNEL: FunnelStats = { sent: 0, delivered: 0, opened: 0, read: 0, clicked: 0, failed: 0 };

function CustomAreaTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-card)] p-4 rounded-[var(--radius)] shadow-[var(--shadow-md)] border border-[var(--border)] min-w-[150px]">
      <p className="font-semibold text-[var(--text-primary)] mb-2 border-b border-[var(--border-muted)] pb-2">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-bold text-[var(--text-primary)]">{formatNumber(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapTooltip({
  day,
  hour,
  value,
  visible,
  x,
  y,
}: {
  day: string;
  hour: string;
  value: number;
  visible: boolean;
  x: number;
  y: number;
}) {
  if (!visible) return null;
  return (
    <div
      className="fixed bg-[var(--text-primary)] text-[var(--bg-card)] text-xs py-1 px-2 rounded pointer-events-none z-50 shadow-[var(--shadow-md)] transform -translate-x-1/2 -translate-y-full mt-[-8px]"
      style={{ left: x, top: y }}
    >
      <div className="font-medium">
        {day} {hour}
      </div>
      <div className="opacity-80">{value} engagements</div>
      <div className="absolute w-2 h-2 bg-[var(--text-primary)] rotate-45 left-1/2 -bottom-1 -translate-x-1/2" />
    </div>
  );
}

function DateRangeFilter({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
        <Calendar className="w-3.5 h-3.5" />
        Date range
      </span>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] flex p-1 shadow-[var(--shadow)] text-sm">
        {DATE_RANGES.map((range) => (
          <button
            key={range.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(range.value)}
            className={cn(
              "px-4 py-1.5 rounded-[var(--radius-sm)] font-medium transition-colors focus-ring disabled:opacity-50",
              value === range.value
                ? "bg-[var(--accent)] text-[var(--text-on-accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: ReactNode;
}) {
  return (
    <Card className="flex items-center gap-[var(--space-4)]">
      <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {value}
          {suffix && (
            <span className="text-sm font-semibold text-[var(--text-muted)] ml-0.5">{suffix}</span>
          )}
        </p>
      </div>
    </Card>
  );
}

function pctOfSent(value: number, sent: number): number {
  if (!sent) return 0;
  return Math.round((value / sent) * 100);
}

function FunnelBars({ funnel }: { funnel: FunnelStats }) {
  const safeSent = funnel.sent || 1;
  const maxValue = Math.max(funnel.sent, 1);

  return (
    <>
      <div className="space-y-4">
        {FUNNEL_STEPS.map((step, idx) => {
          const value = funnel[step.key];
          const percent = pctOfSent(value, safeSent);
          const width = Math.max((value / maxValue) * 100, value > 0 ? 4 : 0);

          return (
            <div key={step.key}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-[var(--text-primary)]">{step.label}</span>
                <span className="text-[var(--text-muted)] font-medium">
                  {formatNumber(value)} ({percent}%)
                </span>
              </div>
              <div className="h-3 w-full bg-[var(--bg-muted)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.08, ease: "easeOut" }}
                  className={cn("h-full rounded-full", step.color)}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-[var(--border-muted)] flex flex-wrap gap-2">
        <span className="bg-[var(--bg-muted)] rounded-full px-3 py-1 text-xs font-medium border border-[var(--border)] text-[var(--text-primary)]">
          {funnel.delivered ? Math.round((funnel.delivered / safeSent) * 100) : 0}% delivery
        </span>
        <span className="bg-[var(--bg-muted)] rounded-full px-3 py-1 text-xs font-medium border border-[var(--border)] text-[var(--text-primary)]">
          {funnel.delivered ? Math.round((funnel.opened / funnel.delivered) * 100) : 0}% open rate
        </span>
        <span className="bg-[var(--bg-muted)] rounded-full px-3 py-1 text-xs font-medium border border-[var(--border)] text-[var(--text-primary)]">
          {funnel.opened ? Math.round((funnel.clicked / funnel.opened) * 100) : 0}% CTR
        </span>
      </div>
    </>
  );
}

function ChannelMetricTile({
  label,
  value,
  sent,
  icon: Icon,
  color,
  bg,
  barColor,
}: {
  label: string;
  value: number;
  sent: number;
  icon: ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  barColor: string;
}) {
  const rate = label === "Sent" ? 100 : pctOfSent(value, sent);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-muted)] p-[var(--space-4)]">
      <div className={cn("w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center mb-3", bg)}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatNumber(value)}</p>
      <p className="text-xs text-[var(--text-subtle)] mt-1">{rate}% of sent</p>
      <div className="mt-2 h-1.5 w-full bg-[var(--bg-card)] rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
    </div>
  );
}

function exportAnalyticsCsv(data: AnalyticsData, days: number) {
  const rows: string[][] = [
    ["Xeno CRM Analytics Export"],
    ["Date Range", `Last ${days} days`],
    ["Exported", new Date().toISOString()],
    [],
    ["Global KPIs"],
    ["Metric", "Value"],
    ["Total Sent", String(data.kpis.totalSent)],
    ["Delivery Rate (%)", String(data.kpis.deliveryRate)],
    ["Open Rate (%)", String(data.kpis.openRate)],
    ["Click Rate (%)", String(data.kpis.clickRate)],
    ["Failure Rate (%)", String(data.kpis.failureRate)],
    ["Failed Count", String(data.kpis.failed)],
    [],
    ["Global Funnel"],
    ["Stage", "Count"],
    ["Sent", String(data.funnel.sent)],
    ["Delivered", String(data.funnel.delivered)],
    ["Opened", String(data.funnel.opened)],
    ["Read", String(data.funnel.read)],
    ["Clicked", String(data.funnel.clicked)],
    ["Failed", String(data.funnel.failed)],
    [],
    ["Attributed Orders", String(data.attributedOrders)],
    [],
    ["Channel Breakdown"],
    ["Channel", "Sent", "Delivered", "Opened", "Read", "Clicked", "Failed"],
  ];

  for (const ch of CHANNELS) {
    const stats = data.channels[ch.id];
    rows.push([
      ch.label,
      String(stats.sent),
      String(stats.delivered),
      String(stats.opened),
      String(stats.read),
      String(stats.clicked),
      String(stats.failed),
    ]);
  }

  rows.push([]);
  rows.push(["Engagement Over Time"]);
  rows.push(["Date", "Sent", "Delivered", "Opened", "Clicked"]);
  for (const point of data.timeSeries) {
    rows.push([
      point.label,
      String(point.sent),
      String(point.delivered),
      String(point.opened),
      String(point.clicked),
    ]);
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `xeno-analytics-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Analytics() {
  const [days, setDays] = useState(30);
  const [activeChannel, setActiveChannel] = useState<(typeof CHANNELS)[number]["id"]>("whatsapp");
  const { data: analytics, loading, error, refetch } = useFetch(() => api.getAnalytics(days), {
    cacheKey: `analytics:${days}`,
    deps: [days],
  });
  const { data: campaigns } = useFetch(() => api.getCampaigns(), { cacheKey: "campaigns" });

  const funnel = analytics?.funnel ?? EMPTY_FUNNEL;
  const kpis = analytics?.kpis ?? {
    totalSent: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    failureRate: 0,
    failed: 0,
  };
  const channelStats = analytics?.channels?.[activeChannel] ?? EMPTY_FUNNEL;
  const timeSeriesData = analytics?.timeSeries ?? [];
  const heatmap = analytics?.heatmap ?? { days: [], hours: [], data: [] };

  const maxHeatValue = useMemo(
    () => Math.max(...heatmap.data.map((d) => d.value), 1),
    [heatmap.data]
  );

  const topCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return [...campaigns]
      .filter((c) => c.stats.sent > 0)
      .map((c) => ({
        name: c.name,
        ctr: Number(((c.stats.clicked / c.stats.sent) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 5);
  }, [campaigns]);

  const [heatmapHover, setHeatmapHover] = useState({
    visible: false,
    day: "",
    hour: "",
    value: 0,
    x: 0,
    y: 0,
  });

  const isInitialLoad = loading && !analytics;

  if (error && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-4">
        <p className="text-[var(--error)] font-medium">Failed to load analytics</p>
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="space-y-[var(--page-gap)]">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-[var(--space-4)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <ChartSkeleton height="h-48" />
        <ChartSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--page-gap)]">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={cn(
        "space-y-[var(--page-gap)] pb-12 relative transition-opacity",
        loading && "opacity-60 pointer-events-none"
      )}
    >
      <HeatmapTooltip {...heatmapHover} />

      <PageHeader
        title="Analytics"
        description={`Communication performance across all channels · last ${days} days`}
        actions={
          <>
            <DateRangeFilter value={days} onChange={setDays} disabled={loading} />
            <Button
              variant="outline"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => analytics && exportAnalyticsCsv(analytics, days)}
              disabled={!analytics}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {/* KPI Summary Row */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-[var(--space-4)]">
        <KpiCard label="Total Sent" value={formatNumber(kpis.totalSent)} icon={<Send className="w-5 h-5" />} />
        <KpiCard label="Delivery Rate" value={kpis.deliveryRate} suffix="%" icon={<CheckCircle2 className="w-5 h-5" />} />
        <KpiCard label="Open Rate" value={kpis.openRate} suffix="%" icon={<Eye className="w-5 h-5" />} />
        <KpiCard label="CTR" value={kpis.clickRate} suffix="%" icon={<MousePointerClick className="w-5 h-5" />} />
        <KpiCard label="Failed" value={formatNumber(kpis.failed)} icon={<AlertTriangle className="w-5 h-5" />} />
        <KpiCard
          label="Attributed Orders"
          value={formatNumber(analytics?.attributedOrders ?? 0)}
          icon={<ShoppingBag className="w-5 h-5" />}
        />
      </motion.div>

      {/* Communication Funnel */}
      <motion.div variants={item}>
        <Card hover>
          <CardHeader
            title="Communication Funnel"
            description={`All channels combined · ${formatNumber(funnel.sent)} messages sent in the last ${days} days`}
          />
          <FunnelBars funnel={funnel} />
        </Card>
      </motion.div>

      {/* Channel Tabs */}
      <motion.div variants={item}>
        <Card padding={false} className="overflow-hidden">
          <div className="px-[var(--card-padding)] pt-[var(--card-padding)] pb-0">
            <CardHeader
              title="Channel Performance"
              description="Sent, delivered, opened, clicked, and failed by channel"
              className="mb-0"
            />
          </div>
          <div className="flex border-y border-[var(--border)] overflow-x-auto">
            {CHANNELS.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChannel === ch.id;
              const stats = analytics?.channels?.[ch.id] ?? EMPTY_FUNNEL;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChannel(ch.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus-ring -mb-px",
                    isActive
                      ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]"
                      : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  <Icon className="w-4 h-4" style={{ color: isActive ? ch.color : undefined }} />
                  {ch.label}
                  <span className="text-xs text-[var(--text-subtle)] font-normal">
                    ({formatNumber(stats.sent)})
                  </span>
                </button>
              );
            })}
          </div>
          <div className="p-[var(--card-padding)] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[var(--space-4)]">
            {METRIC_TILES.map((tile) => {
              const value = channelStats[tile.key];
              return (
                <ChannelMetricTile
                  key={tile.key}
                  label={tile.label}
                  value={value}
                  sent={channelStats.sent || 1}
                  icon={tile.icon}
                  color={tile.color}
                  bg={tile.bg}
                  barColor={tile.barColor}
                />
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Engagement Over Time */}
      <motion.div variants={item}>
        <Card hover>
          <CardHeader title="Engagement Over Time" description={`Last ${days} days`} />
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-series-sent)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-series-sent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-series-opened)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-series-opened)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorClicked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-series-clicked)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-series-clicked)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--chart-text)" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--chart-text)" }} tickFormatter={(val) => formatNumber(val)} />
                <RechartsTooltip content={<CustomAreaTooltip />} cursor={{ stroke: "var(--chart-grid)", strokeWidth: 1, strokeDasharray: "3 3" }} />
                <Area type="monotone" dataKey="sent" name="Sent" stroke="var(--chart-series-sent)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" animationDuration={1000} />
                <Area type="monotone" dataKey="opened" name="Opened" stroke="var(--chart-series-opened)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOpened)" animationDuration={1000} />
                <Area type="monotone" dataKey="clicked" name="Clicked" stroke="var(--chart-series-clicked)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorClicked)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Heatmap */}
      <motion.div variants={item}>
        <Card hover className="overflow-hidden">
          <CardHeader title="Best Performing Times" description="Engagement index by day and hour (local time)" />
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-25 gap-1 mb-1">
                <div className="w-12" />
                {heatmap.hours.filter((_, i) => i % 2 === 0).map((hour) => (
                  <div key={hour} className="col-span-2 text-center text-[10px] text-[var(--text-subtle)] font-medium">
                    {hour}
                  </div>
                ))}
              </div>
              <div onMouseLeave={() => setHeatmapHover((h) => ({ ...h, visible: false }))}>
                {heatmap.days.map((day) => (
                  <div key={day} className="flex gap-1 mb-1 items-center">
                    <div className="w-12 text-xs font-medium text-[var(--text-muted)] text-right pr-2">{day}</div>
                    <div className="flex-1 grid grid-cols-24 gap-1">
                      {heatmap.data
                        .filter((d) => d.day === day)
                        .map((d, i) => {
                          const opacity = Math.min(1, Math.max(0.1, d.value / maxHeatValue));
                          return (
                            <div
                              key={i}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHeatmapHover({
                                  visible: true,
                                  day,
                                  hour: d.hour,
                                  value: d.value,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top,
                                });
                              }}
                              className="h-6 rounded-sm bg-[var(--accent)] transition-opacity hover:opacity-100 hover:ring-2 hover:ring-[var(--accent)] cursor-pointer"
                              style={{ opacity }}
                            />
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 mt-4 text-xs text-[var(--text-muted)]">
                <span>Low</span>
                <div className="flex gap-1">
                  {[0.2, 0.4, 0.6, 0.8, 1].map((o) => (
                    <div key={o} className="w-4 h-4 rounded-sm bg-[var(--accent)]" style={{ opacity: o }} />
                  ))}
                </div>
                <span>High</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Top Campaigns by CTR */}
      <motion.div variants={item}>
        <Card hover>
          <CardHeader title="Top 5 Campaigns by CTR" description="Click-through rates for recent campaigns" />
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCampaigns} layout="vertical" margin={{ top: 0, right: 40, left: 100, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="var(--chart-grid)" />
                <XAxis type="number" domain={[0, "dataMax + 2"]} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--chart-text)" }} width={100} />
                <RechartsTooltip
                  cursor={{ fill: "var(--chart-cursor)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    background: "var(--chart-tooltip-bg)",
                    border: "1px solid var(--chart-tooltip-border)",
                    boxShadow: "var(--shadow-md)",
                  }}
                  formatter={(value: number) => [`${value}%`, "CTR"]}
                />
                <Bar dataKey="ctr" fill="var(--success)" radius={[0, 4, 4, 0]} barSize={24} animationDuration={1200}>
                  <LabelList dataKey="ctr" position="right" formatter={(val: number) => `${val}%`} fill="var(--chart-text)" fontSize={12} fontWeight={600} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
