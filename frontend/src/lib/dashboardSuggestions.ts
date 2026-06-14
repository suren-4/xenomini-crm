import type { Campaign, DashboardData, Segment } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export interface DashboardSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  href: string;
  priority: "high" | "medium" | "low";
}

export function buildDashboardSuggestions(
  dashboard: DashboardData,
  campaigns: Campaign[],
  segments: Segment[]
): DashboardSuggestion[] {
  const suggestions: DashboardSuggestion[] = [];

  const drafts = campaigns.filter((c) => c.status === "draft");
  if (drafts.length > 0) {
    suggestions.push({
      id: "draft-campaigns",
      title: `${drafts.length} draft${drafts.length > 1 ? "s" : ""} ready to launch`,
      description: `Send "${drafts[0].name}" to ${drafts[0].segmentName}`,
      action: "Go to campaigns",
      href: "/campaigns",
      priority: "high",
    });
  }

  if (dashboard.deliveryRate < 90 && dashboard.funnel.sent > 0) {
    suggestions.push({
      id: "low-delivery",
      title: "Delivery rate needs attention",
      description: `${dashboard.deliveryRate}% delivered — check channel health in Analytics`,
      action: "View analytics",
      href: "/analytics",
      priority: "high",
    });
  }

  const segmentIdsWithCampaigns = new Set(campaigns.map((c) => c.segmentId));
  const untargeted = segments
    .filter((s) => !segmentIdsWithCampaigns.has(s.id))
    .sort((a, b) => b.customerCount - a.customerCount);

  if (untargeted.length > 0) {
    const top = untargeted[0];
    suggestions.push({
      id: "untargeted-segment",
      title: `Activate ${top.name}`,
      description: `${formatNumber(top.customerCount)} customers have no campaign yet`,
      action: "Create campaign",
      href: "/segments",
      priority: "medium",
    });
  }

  const openRate = dashboard.funnel.delivered
    ? Math.round((dashboard.funnel.opened / dashboard.funnel.delivered) * 100)
    : 0;

  if (openRate < 45 && dashboard.funnel.delivered > 20) {
    suggestions.push({
      id: "low-open-rate",
      title: "Boost message open rates",
      description: `${openRate}% open rate — ask CampaignGPT to rewrite your top campaign copy`,
      action: "Improve copy",
      href: "/campaigns",
      priority: "medium",
    });
  }

  const sending = campaigns.filter((c) => c.status === "sending");
  if (sending.length > 0) {
    suggestions.push({
      id: "sending-in-progress",
      title: `${sending.length} campaign${sending.length > 1 ? "s" : ""} sending now`,
      description: `Monitor "${sending[0].name}" delivery progress live`,
      action: "Monitor",
      href: "/campaigns",
      priority: "low",
    });
  }

  const topSegment = [...segments].sort((a, b) => b.customerCount - a.customerCount)[0];
  if (topSegment && suggestions.length < 4) {
    suggestions.push({
      id: "top-segment",
      title: `Promote to ${topSegment.name}`,
      description: `Largest audience (${topSegment.percentOfTotal}% of base) — high-impact target`,
      action: "View segments",
      href: "/segments",
      priority: "low",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "getting-started",
      title: "Launch your first campaign",
      description: "Create a segment, then use CampaignGPT to draft a multi-channel message",
      action: "Get started",
      href: "/segments",
      priority: "medium",
    });
  }

  return suggestions.slice(0, 4);
}
