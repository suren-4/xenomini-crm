import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  Smartphone,
  Mail,
  Radio,
  Users,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  getPriorityLabel,
  type AiRecommendation,
  type AiRecommendationType,
  type AiPriorityLabel,
} from "@/lib/aiRecommendations";
import { useAgentContext } from "@/context/AgentContext";
import { cn } from "@/lib/utils";

const typeIcons: Record<AiRecommendationType, typeof Users> = {
  winback: Users,
  channel: MessageCircle,
  segment: Users,
  engagement: TrendingUp,
};

const barColors: Record<AiPriorityLabel, string> = {
  high: "bg-[var(--warning)]",
  medium: "bg-[var(--accent)]",
  low: "bg-[var(--info)]",
};

function ChannelTypeIcon({ insight }: { insight: string }) {
  const lower = insight.toLowerCase();
  if (lower.includes("whatsapp")) return <MessageCircle className="w-3.5 h-3.5 text-[var(--channel-whatsapp-text)]" strokeWidth={1.75} />;
  if (lower.includes("sms")) return <Smartphone className="w-3.5 h-3.5 text-[var(--channel-sms-text)]" strokeWidth={1.75} />;
  if (lower.includes("email")) return <Mail className="w-3.5 h-3.5 text-[var(--channel-email-text)]" strokeWidth={1.75} />;
  if (lower.includes("rcs")) return <Radio className="w-3.5 h-3.5 text-[var(--channel-rcs-text)]" strokeWidth={1.75} />;
  return null;
}

function TypeIcon({ recommendation }: { recommendation: AiRecommendation }) {
  if (recommendation.type === "channel") {
    return <ChannelTypeIcon insight={recommendation.insight} />;
  }
  const Icon = typeIcons[recommendation.type];
  return <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.75} />;
}

function RecommendationFunnelRow({
  recommendation,
  index,
}: {
  recommendation: AiRecommendation;
  index: number;
}) {
  const { openCampaignGPT } = useAgentContext();
  const level = getPriorityLabel(recommendation.priority);
  const width = Math.max(recommendation.priority, 20);
  const isGptAction = recommendation.action === "open_campaigngpt";

  const actionLink = isGptAction ? (
    <button
      type="button"
      onClick={openCampaignGPT}
      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:opacity-80 transition-opacity mt-1.5"
    >
      {recommendation.actionLabel}
      <ArrowRight className="w-3 h-3" />
    </button>
  ) : (
    <Link
      to={recommendation.href}
      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:opacity-80 transition-opacity mt-1.5"
    >
      {recommendation.actionLabel}
      <ArrowRight className="w-3 h-3" />
    </Link>
  );

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5 gap-2">
        <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5 min-w-0">
          <TypeIcon recommendation={recommendation} />
          <span className="line-clamp-2 text-[13px] leading-snug">{recommendation.insight}</span>
        </span>
        <span className="text-[var(--text-muted)] tabular-nums shrink-0 text-[11px] sm:text-xs text-right">
          {recommendation.metricValue ??
            (level === "high" ? "High impact" : level === "medium" ? "Med impact" : "")}
        </span>
      </div>
      <div className="h-2.5 w-full bg-[var(--bg-muted)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.7, delay: index * 0.08, ease: "easeOut" }}
          className={cn("h-full rounded-full", barColors[level])}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-1.5">{recommendation.cta}</p>
      {actionLink}
    </div>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="flex justify-between mb-1.5 gap-3">
            <div className="h-4 w-2/3 max-w-xs rounded bg-[var(--bg-muted)] animate-pulse" />
            <div className="h-4 w-16 rounded bg-[var(--bg-muted)] animate-pulse shrink-0" />
          </div>
          <div className="h-2.5 w-full rounded-full bg-[var(--bg-muted)] animate-pulse" />
          <div className="h-3 w-1/2 max-w-[200px] rounded bg-[var(--bg-muted)] animate-pulse mt-2" />
        </div>
      ))}
    </div>
  );
}

interface AiRecommendationsPanelProps {
  recommendations: AiRecommendation[];
  loading?: boolean;
}

export function AiRecommendationsPanel({ recommendations, loading }: AiRecommendationsPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[var(--accent-muted)] text-[var(--accent)]">
              AI
            </span>
            Recommendations
          </span>
        }
        description="Data-driven suggestions to grow revenue and engagement"
      />

      {loading ? (
        <RecommendationsSkeleton />
      ) : recommendations.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          No recommendations right now — check back after more campaign activity.
        </p>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <RecommendationFunnelRow key={rec.id} recommendation={rec} index={idx} />
          ))}
        </div>
      )}
    </Card>
  );
}
