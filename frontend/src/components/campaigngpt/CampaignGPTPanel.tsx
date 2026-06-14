import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  X,
  RotateCcw,
  Minus,
  SendHorizonal,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  sendToCampaignGPT,
  executeAgentProposal,
  buildAgentContext,
  getQuickReplies,
  segmentActionToRules,
  type GPTProposal,
  type AgentExecuteStep,
  type AgentIntent,
  type AgentAction,
} from "@/lib/campaignGPT";
import { useAgentContext } from "@/context/AgentContext";
import { ProposalCard, type LaunchState } from "./ProposalCard";
import { AgentPlanCard } from "./AgentPlanCard";
import {
  SegmentActionCard,
  FindCustomersCard,
  AnalyticsInsightCard,
  CustomerAnalysisCard,
  CampaignStatsCard,
  QuickReplyChips,
  type CardLaunchState,
} from "./ActionCards";

interface CampaignGPTPanelProps {
  onClose: () => void;
  panelWidth: number;
  onPanelWidthChange: (width: number) => void;
  onResizingChange: (resizing: boolean) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: AgentIntent;
  plan?: string[];
  action?: AgentAction | null;
  proposal?: GPTProposal | null;
  quickReplies?: string[];
  executedSteps?: AgentExecuteStep[];
  linkAction?: { label: string; path: string };
}

const AGENT_PHASES = [
  "Reading live CRM data...",
  "Detecting intent...",
  "Planning next action...",
  "Preparing response...",
];

function AgentThinking({ phase }: { phase: string }) {
  return (
    <div className="max-w-[95%] bg-[var(--bg-hover)] border border-[var(--border)] rounded-[2px_12px_12px_12px] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Bot className="w-3 h-3 text-[var(--accent)] animate-pulse" />
        <span className="text-[11px] text-[var(--text-muted)]">{phase}</span>
      </div>
      <div className="flex items-center gap-[3px] mt-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-[5px] h-[5px] bg-[var(--accent)] rounded-full"
            style={{
              animation: "campaigngpt-bounce 1.2s infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ExecutedStepsCard({ steps }: { steps: AgentExecuteStep[] }) {
  return (
    <div className="w-full mt-1.5 rounded-[10px] border border-[var(--success-border)] bg-[var(--success-bg)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--success-border)]">
        <span className="text-[9px] font-bold tracking-widest text-[var(--success)] uppercase">
          Agent executed
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {steps.map((step) => (
          <div key={step.label} className="flex items-start gap-2">
            <Check className="w-3 h-3 text-[var(--success)] shrink-0 mt-0.5" strokeWidth={3} />
            <div>
              <p className="text-[11px] font-medium text-[var(--text-primary)]">{step.label}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextChips({
  pageLabel,
  campaign,
  customer,
}: {
  pageLabel: string;
  campaign: { name: string } | null;
  customer: { name: string } | null;
}) {
  return (
    <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 flex flex-wrap gap-1.5">
      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] font-medium">
        Viewing: {pageLabel}
      </span>
      {campaign && (
        <span
          className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] font-medium max-w-full truncate"
          title={campaign.name}
        >
          Selected Campaign: {campaign.name}
        </span>
      )}
      {customer && (
        <span
          className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] font-medium max-w-full truncate"
          title={customer.name}
        >
          Selected Customer: {customer.name}
        </span>
      )}
    </div>
  );
}

export function CampaignGPTPanel({
  onClose,
  panelWidth,
  onPanelWidthChange,
  onResizingChange,
}: CampaignGPTPanelProps) {
  const navigate = useNavigate();
  const { pageLabel, selectedCampaign, selectedCustomer } = useAgentContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState(AGENT_PHASES[0]);
  const [launchStates, setLaunchStates] = useState<Record<string, LaunchState>>({});
  const [segmentStates, setSegmentStates] = useState<Record<string, CardLaunchState>>({});
  const [isResizing, setIsResizing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const newW = window.innerWidth - e.clientX;
      onPanelWidthChange(Math.min(600, Math.max(280, newW)));
    };
    const onUp = () => {
      setIsResizing(false);
      onResizingChange(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing, onPanelWidthChange, onResizingChange]);

  useEffect(() => {
    if (!isThinking) return;
    let index = 0;
    setThinkingPhase(AGENT_PHASES[0]);
    const timer = window.setInterval(() => {
      index = (index + 1) % AGENT_PHASES.length;
      setThinkingPhase(AGENT_PHASES[index]);
    }, 900);
    return () => window.clearInterval(timer);
  }, [isThinking]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, scrollToBottom]);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 200);
  }, []);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const clearChat = () => {
    setMessages([]);
    setLaunchStates({});
    setSegmentStates({});
    setInput("");
    setIsThinking(false);
  };

  const buildHistory = (msgs: ChatMessage[]) =>
    msgs.map((m) => ({ role: m.role, content: m.content }));

  const appendAssistant = (msg: Omit<ChatMessage, "id" | "role" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        timestamp: new Date(),
        ...msg,
      },
    ]);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      },
    ]);
    setInput("");
    setIsThinking(true);

    try {
      const agentContext = await buildAgentContext({
        pageLabel,
        selectedCampaign,
        selectedCustomer,
      });
      const response = await sendToCampaignGPT(trimmed, buildHistory(messages), agentContext);
      const quickReplies =
        response.intent === "general" && !response.action
          ? getQuickReplies("general")
          : response.intent === "create_campaign" || response.intent === "create_segment"
            ? undefined
            : getQuickReplies(response.intent);

      appendAssistant({
        content: response.message,
        intent: response.intent,
        plan: response.plan,
        action: response.action,
        proposal: response.proposal,
        quickReplies,
      });
    } catch (error) {
      appendAssistant({
        content:
          error instanceof Error
            ? error.message
            : "The agent hit a connection issue. Please try again.",
        quickReplies: getQuickReplies("general"),
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleLaunch = async (messageId: string, proposal: GPTProposal) => {
    setLaunchStates((prev) => ({ ...prev, [messageId]: "loading" }));

    try {
      const result = await executeAgentProposal(proposal);
      setLaunchStates((prev) => ({ ...prev, [messageId]: "success" }));

      appendAssistant({
        content: `Done. I created the segment, drafted the campaign, and launched it to ${result.count} customers. Track delivery in Campaigns.`,
        intent: "create_campaign",
        executedSteps: result.steps,
        linkAction: { label: "View Campaign", path: "/campaigns" },
        quickReplies: getQuickReplies("create_campaign"),
      });
    } catch (error) {
      setLaunchStates((prev) => ({ ...prev, [messageId]: "error" }));
      appendAssistant({
        content:
          error instanceof Error
            ? error.message
            : "Execution failed. Please try again or modify the proposal.",
      });
    }
  };

  const handleCreateSegment = async (messageId: string, action: AgentAction) => {
    setSegmentStates((prev) => ({ ...prev, [messageId]: "loading" }));

    try {
      const segment = action.segment as {
        name: string;
        rules?: GPTProposal["segment"]["rules"];
      };
      const { rules, ruleLogic } = segmentActionToRules(segment);
      const created = await api.createSegment({
        name: segment.name,
        rules,
        ruleLogic,
      });

      setSegmentStates((prev) => ({ ...prev, [messageId]: "success" }));

      appendAssistant({
        content: `Segment '${created.name}' created with ${created.customerCount} customers.`,
        intent: "create_segment",
        quickReplies: getQuickReplies("create_segment", {
          segmentName: created.name,
          count: created.customerCount,
        }),
      });

      appendAssistant({
        content: `Want me to create a campaign for these ${created.customerCount} customers now?`,
        quickReplies: ["Yes, create a campaign", "No thanks"],
      });
    } catch (error) {
      setSegmentStates((prev) => ({ ...prev, [messageId]: "error" }));
      appendAssistant({
        content: error instanceof Error ? error.message : "Failed to create segment.",
      });
    }
  };

  const handleModify = (prefix = "Modify the plan: ") => {
    setInput(prefix);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(prefix.length, prefix.length);
    }, 0);
  };

  const handleViewCustomers = (filters: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (filters.city) params.set("city", String(filters.city));
    if (filters.minSpend) params.set("minSpend", String(filters.minSpend));
    if (filters.maxSpend) params.set("maxSpend", String(filters.maxSpend));
    onClose();
    navigate(`/customers${params.toString() ? `?${params}` : ""}`);
  };

  const renderActionCard = (msg: ChatMessage) => {
    const intent = msg.intent;
    const action = msg.action;

    if (msg.proposal && (intent === "create_campaign" || !intent)) {
      return (
        <ProposalCard
          proposal={msg.proposal}
          launchState={launchStates[msg.id] ?? "idle"}
          onLaunch={() => handleLaunch(msg.id, msg.proposal!)}
          onModify={() => handleModify()}
        />
      );
    }

    if (!action) return null;

    switch (action.type ?? intent) {
      case "create_segment":
        return (
          <SegmentActionCard
            action={action}
            launchState={segmentStates[msg.id] ?? "idle"}
            onCreate={() => handleCreateSegment(msg.id, action)}
            onModify={() => handleModify("Modify the segment: ")}
          />
        );
      case "find_customers":
        return (
          <FindCustomersCard
            action={action}
            onViewAll={handleViewCustomers}
            onQuickReply={sendMessage}
          />
        );
      case "show_analytics":
        return (
          <AnalyticsInsightCard
            action={action}
            onViewAnalytics={() => {
              onClose();
              navigate("/analytics");
            }}
          />
        );
      case "analyze_customers":
        return <CustomerAnalysisCard action={action} />;
      case "campaign_stats":
        return <CampaignStatsCard action={action} />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="relative flex flex-col h-full w-full bg-[var(--bg-card)] overflow-hidden"
      style={{ width: panelWidth, minWidth: 280, maxWidth: 600 }}
    >
      <style>{`
        @keyframes campaigngpt-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        .campaigngpt-scroll::-webkit-scrollbar { width: 4px; }
        .campaigngpt-scroll::-webkit-scrollbar-track { background: transparent; }
        .campaigngpt-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 2px;
        }
      `}</style>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={() => {
          setIsResizing(true);
          onResizingChange(true);
        }}
        className={`absolute left-0 top-0 w-1 h-full cursor-col-resize z-10 hover:bg-[var(--accent)]/50 ${
          isResizing ? "bg-[var(--accent)]" : ""
        }`}
      />

      <header className="h-[35px] shrink-0 border-b border-[var(--border)] bg-[var(--bg-card)] px-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bot className="w-3 h-3 text-[var(--accent)]" />
          <span className="text-[12px] font-semibold text-[var(--text-muted)] tracking-wide">
            CampaignGPT Agent
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={clearChat}
            title="Clear conversation"
            className="w-5 h-5 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            title="Minimize"
            className="w-5 h-5 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="w-5 h-5 flex items-center justify-center rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </header>

      <ContextChips
        pageLabel={pageLabel}
        campaign={selectedCampaign}
        customer={selectedCustomer}
      />

      <div className="flex-1 overflow-y-auto campaigngpt-scroll px-3 py-4 space-y-3">
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--accent-muted)] border border-[var(--accent)]/20 flex items-center justify-center">
              <Bot className="w-[18px] h-[18px] text-[var(--accent)]" />
            </div>
            <p className="text-[13px] font-semibold text-[var(--text-primary)] mt-2.5">
              CRM Agent
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 px-4 leading-relaxed">
              Ask me to create campaigns, build segments, find customers, analyze data, or check
              performance — all through natural language.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <div className="flex flex-col items-end ml-auto max-w-[85%]">
                <div className="bg-[var(--accent)] text-[var(--text-on-accent)] text-[12px] leading-relaxed px-3 py-2 rounded-[12px_12px_2px_12px] break-words">
                  {msg.content}
                </div>
                <span className="text-[10px] text-[var(--text-subtle)] mt-0.5 text-right">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-start max-w-[95%]">
                <div className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-[2px_12px_12px_12px] px-3 py-2 text-[12px] leading-relaxed text-[var(--text-primary)]">
                  {msg.content}
                  {msg.linkAction && (
                    <button
                      onClick={() => {
                        onClose();
                        navigate(msg.linkAction!.path);
                      }}
                      className="mt-1.5 text-[var(--accent)] underline text-[11px] block hover:opacity-80"
                    >
                      {msg.linkAction.label}
                    </button>
                  )}
                </div>

                {msg.plan && msg.plan.length > 0 && (
                  <AgentPlanCard
                    plan={msg.plan}
                    completed={Boolean(msg.executedSteps?.length)}
                  />
                )}

                {renderActionCard(msg)}

                {msg.executedSteps && msg.executedSteps.length > 0 && (
                  <ExecutedStepsCard steps={msg.executedSteps} />
                )}

                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <QuickReplyChips replies={msg.quickReplies} onSelect={sendMessage} />
                )}

                <span className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            )}
          </div>
        ))}

        {isThinking && <AgentThinking phase={thinkingPhase} />}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-card)] p-2">
        <div className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-[10px] p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything — campaigns, segments, customers, analytics..."
            rows={1}
            className="w-full bg-transparent border-none outline-none text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] resize-none leading-relaxed"
            style={{ minHeight: 36, maxHeight: 100 }}
            disabled={isThinking}
          />
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[9px] text-[var(--text-subtle)] font-mono">
              Agent · Groq Llama 3.3
            </span>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isThinking}
              className="w-[26px] h-[26px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
            >
              <SendHorizonal className="w-3 h-3 text-[var(--text-on-accent)]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
