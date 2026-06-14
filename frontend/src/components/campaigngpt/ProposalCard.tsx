import { useEffect, useState } from "react";
import { Users, MessageSquare, Loader2, Check, Bot } from "lucide-react";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { filterCustomersByRules } from "@/lib/segments";
import {
  type GPTProposal,
  proposalToSegmentRules,
  normalizeChannel,
  formatConditionPill,
  previewMessage,
} from "@/lib/campaignGPT";

export type LaunchState = "idle" | "loading" | "success" | "error";

interface ProposalCardProps {
  proposal: GPTProposal;
  launchState: LaunchState;
  onLaunch: () => void;
  onModify: () => void;
}

const CHANNEL_BADGE: Record<string, string> = {
  whatsapp: "bg-[var(--channel-whatsapp-bg)] text-[var(--channel-whatsapp-text)]",
  sms: "bg-[var(--channel-sms-bg)] text-[var(--channel-sms-text)]",
  email: "bg-[var(--channel-email-bg)] text-[var(--channel-email-text)]",
  rcs: "bg-[var(--channel-rcs-bg)] text-[var(--channel-rcs-text)]",
};

export function ProposalCard({
  proposal,
  launchState,
  onLaunch,
  onModify,
}: ProposalCardProps) {
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);

  const channel = normalizeChannel(proposal.campaign.channel);
  const conditions = proposal.segment.rules?.conditions ?? [];
  const preview = previewMessage(proposal.campaign.message, channel);

  useEffect(() => {
    let cancelled = false;
    setCountLoading(true);
    const { rules, ruleLogic } = proposalToSegmentRules(proposal);

    api
      .getCustomers()
      .then((customers) => {
        if (cancelled) return;
        setCustomerCount(filterCustomersByRules(customers, rules, ruleLogic).length);
      })
      .catch(() => {
        if (!cancelled) setCustomerCount(null);
      })
      .finally(() => {
        if (!cancelled) setCountLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [proposal]);

  useEffect(() => {
    if (launchState === "success") {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { x: 0.85, y: 0.6 },
        colors: ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981"],
      });
    }
  }, [launchState]);

  return (
    <div className="w-full mt-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--accent-muted)] flex items-center gap-1.5">
        <Bot className="w-3 h-3 text-[var(--accent)]" />
        <span className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wide">
          Awaiting your approval
        </span>
      </div>

      <div className="bg-[var(--accent-muted)] border-b border-[var(--border)] px-3 py-2.5">
        <div className="flex items-center gap-1">
          <Users className="w-2.5 h-2.5 text-[var(--accent)]" />
          <span className="text-[9px] font-bold tracking-widest text-[var(--accent)] uppercase">
            Audience
          </span>
        </div>
        <p className="text-[12px] font-semibold text-[var(--text-primary)] mt-1">
          {proposal.segment.name}
        </p>
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
          {countLoading ? (
            <span className="animate-pulse">counting...</span>
          ) : (
            <span className="font-bold text-[var(--accent)]">{customerCount ?? 0} customers</span>
          )}
        </p>
      </div>

      <div className="px-3 py-2.5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-2.5 h-2.5 text-[var(--accent)]" />
            <span className="text-[9px] font-bold tracking-widest text-[var(--accent)] uppercase">
              Message
            </span>
          </div>
          <span
            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize ${
              CHANNEL_BADGE[channel] ?? "bg-[var(--bg-muted)] text-[var(--text-muted)]"
            }`}
          >
            {proposal.campaign.channel}
          </span>
        </div>
        <div className="mt-1.5 bg-[var(--bg-muted)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[11px] text-[var(--text-primary)] leading-relaxed">
          {preview}
        </div>
        {proposal.campaign.channelReasoning && (
          <p className="mt-1.5 text-[10px] text-[var(--text-muted)] italic">
            {proposal.campaign.channelReasoning}
          </p>
        )}
      </div>

      <div className="px-3 py-2.5 flex gap-2">
        <button
          onClick={onModify}
          disabled={launchState === "loading" || launchState === "success"}
          className="flex-1 h-[30px] bg-transparent border border-[var(--border)] rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
        >
          Modify
        </button>
        <button
          onClick={onLaunch}
          disabled={launchState === "loading" || launchState === "success"}
          className={`flex-1 h-[30px] rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-80 ${
            launchState === "success"
              ? "bg-emerald-500 text-white"
              : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)]"
          }`}
        >
          {launchState === "loading" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Executing...
            </>
          )}
          {launchState === "success" && (
            <>
              <Check className="w-3 h-3" />
              Done
            </>
          )}
          {(launchState === "idle" || launchState === "error") && "Approve & Launch"}
        </button>
      </div>
    </div>
  );
}
