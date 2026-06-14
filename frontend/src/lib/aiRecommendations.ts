import type { AnalyticsData, Campaign, Customer, Segment } from "@/lib/api";
import { daysSince, getAvgOrderValue, getSpendCategory } from "@/lib/customers";
import { formatCurrency, formatNumber } from "@/lib/utils";

export type AiRecommendationType = "winback" | "channel" | "segment" | "engagement";
export type AiPriorityLabel = "high" | "medium" | "low";
export type AiRecommendationAction = "navigate" | "open_campaigngpt";

export interface AiRecommendation {
  id: string;
  type: AiRecommendationType;
  insight: string;
  metricLabel?: string;
  metricValue?: string;
  cta: string;
  actionLabel: string;
  href: string;
  action?: AiRecommendationAction;
  priority: number;
}

export function getPriorityLabel(priority: number): AiPriorityLabel {
  if (priority >= 90) return "high";
  if (priority >= 70) return "medium";
  return "low";
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  rcs: "RCS",
};

function buildWinBackRecommendation(customers: Customer[]): AiRecommendation | null {
  const inactive = customers.filter(
    (c) => c.orderCount > 0 && daysSince(c.lastOrderDate) >= 90
  );
  if (inactive.length < 3) return null;

  const potentialRevenue = inactive.reduce((sum, c) => {
    const aov = getAvgOrderValue(c);
    return sum + aov * 0.35;
  }, 0);

  return {
    id: "winback-inactive",
    type: "winback",
    insight: `${formatNumber(inactive.length)} customers inactive for 90+ days`,
    metricLabel: "Potential revenue",
    metricValue: formatCurrency(Math.round(potentialRevenue)),
    cta: "Create win-back campaign?",
    actionLabel: "Create campaign",
    href: "/campaigns?action=create",
    priority: 100,
  };
}

function buildChannelRecommendation(
  analytics: AnalyticsData,
  customers: Customer[]
): AiRecommendation | null {
  const channelIds = ["whatsapp", "sms", "email", "rcs"] as const;
  const engagement = channelIds
    .map((id) => {
      const stats = analytics.channels[id];
      const rate = stats.sent ? (stats.opened + stats.clicked * 2) / stats.sent : 0;
      return { id, label: CHANNEL_LABELS[id], rate, sent: stats.sent };
    })
    .filter((c) => c.sent >= 5);

  if (engagement.length < 2) return null;

  const sorted = [...engagement].sort((a, b) => b.rate - a.rate);
  const best = sorted[0];
  const avgOthers =
    sorted.slice(1).reduce((sum, c) => sum + c.rate, 0) / (sorted.length - 1);
  const multiplier = avgOthers > 0 ? best.rate / avgOthers : 1;

  if (multiplier < 1.2) return null;

  const premiumCount = customers.filter(
    (c) => getSpendCategory(c.totalSpend) === "vip" || c.totalSpend >= 25000
  ).length;

  const insight =
    premiumCount >= 15
      ? `Premium customers engage ${multiplier.toFixed(1)}x more on ${best.label}`
      : `Customers engage ${multiplier.toFixed(1)}x more on ${best.label}`;

  return {
    id: `channel-${best.id}`,
    type: "channel",
    insight,
    cta: `Recommend ${best.label}.`,
    actionLabel: `Use ${best.label}`,
    href: "/campaigns?action=create",
    priority: 90,
  };
}

function buildUntargetedSegmentRecommendation(
  segments: Segment[],
  campaigns: Campaign[]
): AiRecommendation | null {
  const targeted = new Set(campaigns.map((c) => c.segmentId));
  const untargeted = segments
    .filter((s) => !targeted.has(s.id) && s.customerCount >= 10)
    .sort((a, b) => b.customerCount - a.customerCount);

  if (untargeted.length === 0) return null;

  const top = untargeted[0];
  return {
    id: `segment-${top.id}`,
    type: "segment",
    insight: `${formatNumber(top.customerCount)} customers in "${top.name}" have no campaign`,
    metricLabel: "Audience reach",
    metricValue: `${top.percentOfTotal}% of base`,
    cta: "Launch a targeted campaign?",
    actionLabel: "Create campaign",
    href: "/campaigns?action=create",
    priority: 70,
  };
}

function buildEngagementRecommendation(analytics: AnalyticsData): AiRecommendation | null {
  const { funnel, kpis } = analytics;
  if (funnel.delivered < 20) return null;

  const openRate = funnel.delivered
    ? Math.round((funnel.opened / funnel.delivered) * 100)
    : 0;

  if (openRate >= 50) return null;

  return {
    id: "low-open-rate",
    type: "engagement",
    insight: `Open rate is ${openRate}% — below your 50% target`,
    metricLabel: "Quick win",
    metricValue: "Rewrite subject lines",
    cta: "Ask CampaignGPT to improve copy?",
    actionLabel: "Open CampaignGPT",
    href: "/campaigns",
    action: "open_campaigngpt",
    priority: 60,
  };
}

function buildNewCustomersRecommendation(customers: Customer[]): AiRecommendation | null {
  const newCustomers = customers.filter(
    (c) => c.orderCount > 0 && daysSince(c.createdAt) <= 30
  );
  if (newCustomers.length < 10) return null;

  return {
    id: "welcome-new",
    type: "segment",
    insight: `${formatNumber(newCustomers.length)} new customers joined this month`,
    metricLabel: "Opportunity",
    metricValue: "Welcome series",
    cta: "Send a welcome campaign?",
    actionLabel: "Create campaign",
    href: "/campaigns?action=create",
    priority: 65,
  };
}

export function buildAiRecommendations(
  customers: Customer[],
  analytics: AnalyticsData | null,
  segments: Segment[],
  campaigns: Campaign[]
): AiRecommendation[] {
  const recs: AiRecommendation[] = [];

  const winback = buildWinBackRecommendation(customers);
  if (winback) recs.push(winback);

  if (analytics) {
    const channel = buildChannelRecommendation(analytics, customers);
    if (channel) recs.push(channel);

    const engagement = buildEngagementRecommendation(analytics);
    if (engagement) recs.push(engagement);
  }

  const untargeted = buildUntargetedSegmentRecommendation(segments, campaigns);
  if (untargeted) recs.push(untargeted);

  const newCust = buildNewCustomersRecommendation(customers);
  if (newCust) recs.push(newCust);

  if (recs.length === 0) {
    recs.push({
      id: "getting-started",
      type: "engagement",
      insight: "Your CRM is ready for its first AI-driven campaign",
      metricLabel: "Next step",
      metricValue: "Create a segment",
      cta: "Let CampaignGPT draft your message?",
      actionLabel: "Get started",
      href: "/segments?action=create",
      priority: 50,
    });
  }

  return recs.sort((a, b) => b.priority - a.priority).slice(0, 4);
}
