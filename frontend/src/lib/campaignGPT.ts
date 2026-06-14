import { api, type Campaign, type Customer } from "./api";

export interface GPTCondition {
  field: string;
  operator: string;
  value: string | number;
}

export interface GPTProposal {
  segment: {
    name: string;
    rules: {
      operator: "AND" | "OR";
      conditions: GPTCondition[];
    };
  };
  campaign: {
    name: string;
    message: string;
    channel: string;
    channelReasoning?: string;
  };
}

export type AgentIntent =
  | "create_campaign"
  | "create_segment"
  | "analyze_customers"
  | "show_analytics"
  | "find_customers"
  | "campaign_stats"
  | "general";

export type AgentAction = Record<string, unknown>;

export interface AgentExecuteStep {
  label: string;
  status: "done";
  detail: string;
}

export interface CampaignGPTResponse {
  message: string;
  intent: AgentIntent;
  agentPlan: string[] | null;
  action: AgentAction | null;
  plan: string[];
  proposal: GPTProposal | null;
  awaitingApproval: boolean;
}

export interface AgentExecuteResult {
  segmentId: string;
  campaignId: string;
  count: number;
  steps: AgentExecuteStep[];
}

export interface AgentScreenContext {
  pageLabel: string;
  selectedCampaign?: Campaign | null;
  selectedCustomer?: Customer | null;
}

export async function buildAgentContext(screen: AgentScreenContext): Promise<string> {
  const crm = await fetchCrmContext();
  const lines = [
    "",
    "CURRENT SCREEN CONTEXT:",
    `- Viewing: ${screen.pageLabel}`,
  ];

  if (screen.selectedCampaign) {
    const c = screen.selectedCampaign;
    lines.push(`- Selected Campaign: ${c.name}`);
    lines.push(`  - ID: ${c.id}`);
    lines.push(`  - Segment: ${c.segmentName}`);
    lines.push(`  - Channel: ${c.channel}`);
    lines.push(`  - Status: ${c.status}`);
    lines.push(
      `  - Stats: ${c.stats.sent} sent, ${c.stats.delivered} delivered, ${c.stats.opened} opened, ${c.stats.clicked} clicked`
    );
    if (c.message) {
      lines.push(`  - Message preview: "${c.message.slice(0, 120)}${c.message.length > 120 ? "..." : ""}"`);
    }
  }

  if (screen.selectedCustomer) {
    const cu = screen.selectedCustomer;
    lines.push(`- Selected Customer: ${cu.name}`);
    lines.push(`  - ID: ${cu.id}`);
    lines.push(`  - Email: ${cu.email}`);
    lines.push(`  - City: ${cu.city}`);
    lines.push(`  - Total spend: ₹${cu.totalSpend.toLocaleString("en-IN")}`);
    lines.push(`  - Orders: ${cu.orderCount}`);
  }

  lines.push(
    "",
    "INSTRUCTION: The user is on the screen above. When they say \"this campaign\", \"this customer\", or \"here\", refer to the selected item. Tailor suggestions to the current page."
  );

  return crm + lines.join("\n");
}

export async function fetchCrmContext(): Promise<string> {
  try {
    const [dashboard, segments, campaigns] = await Promise.all([
      api.getDashboard(),
      api.getSegments(),
      api.getCampaigns(),
    ]);

    return [
      `- Total customers: ${dashboard.totalCustomers}`,
      `- Total orders: ${dashboard.totalOrders}`,
      `- Active campaigns: ${dashboard.activeCampaigns}`,
      `- Messages sent this month: ${dashboard.messagesSentThisMonth}`,
      ``,
      `EXISTING SEGMENTS:`,
      segments.length
        ? segments.map((s) => `- ${s.name}: ${s.customerCount} customers`).join("\n")
        : "- (none yet)",
      ``,
      `RECENT CAMPAIGNS:`,
      campaigns.length
        ? campaigns
            .slice(0, 3)
            .map((c) => `- ${c.name}: ${c.status}, ${c.stats?.sent ?? 0} sent`)
            .join("\n")
        : "- (none yet)",
      ``,
      `FUNNEL PERFORMANCE:`,
      `- Sent: ${dashboard.funnel?.sent ?? 0}`,
      `- Delivered: ${dashboard.funnel?.delivered ?? 0}`,
      `- Opened: ${dashboard.funnel?.opened ?? 0}`,
      `- Clicked: ${dashboard.funnel?.clicked ?? 0}`,
    ].join("\n");
  } catch {
    return "- CRM context unavailable (backend may be offline)";
  }
}

export async function sendToCampaignGPT(
  userMessage: string,
  history: { role: string; content: string }[],
  crmContext?: string
): Promise<CampaignGPTResponse> {
  const apiBase = import.meta.env.VITE_API_URL ?? "";

  try {
    const response = await fetch(`${apiBase}/api/campaigngpt/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage, history, crmContext }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const fallback = getLocalFallbackResponse(userMessage);
      if (fallback) return fallback;

      return emptyResponse(
        data.message ||
          data.error ||
          "CampaignGPT agent is unavailable. Make sure the backend is running and GROQ_API_KEY is set in backend/.env."
      );
    }

    return normalizeResponse(data);
  } catch (error) {
    console.error("CampaignGPT agent request failed:", error);
    const fallback = getLocalFallbackResponse(userMessage);
    if (fallback) return fallback;
    return emptyResponse(
      "Cannot reach the backend. Start it with `cd backend && npm run dev`, then try again."
    );
  }
}

function emptyResponse(message: string): CampaignGPTResponse {
  return {
    message,
    intent: "general",
    agentPlan: null,
    action: null,
    plan: [],
    proposal: null,
    awaitingApproval: false,
  };
}

function normalizeResponse(data: Record<string, unknown>): CampaignGPTResponse {
  const intent = (data.intent as AgentIntent) ?? "general";
  const agentPlan = Array.isArray(data.agentPlan)
    ? (data.agentPlan as string[])
    : Array.isArray(data.plan)
      ? (data.plan as string[])
      : null;

  const action =
    data.action && typeof data.action === "object"
      ? (data.action as AgentAction)
      : null;

  const proposal =
    (data.proposal as GPTProposal | null) ??
    (action?.type === "create_campaign" ? actionToProposal(action) : null);

  return {
    message: (data.message as string) ?? "How can I help?",
    intent,
    agentPlan,
    action,
    plan: agentPlan ?? [],
    proposal,
    awaitingApproval: Boolean(data.awaitingApproval),
  };
}

function actionToProposal(action: AgentAction): GPTProposal | null {
  const segment = action.segment as GPTProposal["segment"] | undefined;
  const campaign = action.campaign as GPTProposal["campaign"] | undefined;
  if (!segment?.name || !campaign?.name) return null;
  return { segment, campaign };
}

export async function executeAgentProposal(
  proposal: GPTProposal
): Promise<AgentExecuteResult> {
  const apiBase = import.meta.env.VITE_API_URL ?? "";

  const response = await fetch(`${apiBase}/api/campaigngpt/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proposal }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Agent execution failed");
  }

  return data as AgentExecuteResult;
}

export function getQuickReplies(
  intent: AgentIntent,
  context?: { segmentName?: string; count?: number }
): string[] {
  switch (intent) {
    case "create_campaign":
      return ["View campaign stats", "Create another campaign"];
    case "create_segment":
      return context?.segmentName
        ? [
            `Create a campaign for ${context.segmentName}`,
            `Show me customers in ${context.segmentName}`,
          ]
        : ["Create a campaign for this segment", "Show me these customers"];
    case "find_customers":
      return ["Create a campaign for them", "Show me their spending pattern"];
    case "show_analytics":
      return ["Which channel performs best?", "Create a campaign"];
    case "analyze_customers":
      return ["Create a segment from this", "Show full analytics"];
    case "campaign_stats":
      return ["Create another campaign", "Show all analytics"];
    case "general":
    default:
      return ["Create a campaign", "Analyze my customers", "Show analytics"];
  }
}

function getLocalFallbackResponse(userMessage: string): CampaignGPTResponse | null {
  const text = userMessage.trim().toLowerCase();

  if (/^(hi|hello|hlo|hey|howdy)\b/.test(text)) {
    return {
      message:
        "I'm your CRM agent. I can create campaigns, build segments, find customers, analyze data, and show performance stats — just tell me what you need.",
      intent: "general",
      agentPlan: null,
      action: { type: "general" },
      plan: [],
      proposal: null,
      awaitingApproval: false,
    };
  }

  if (text.includes("mumbai") && (text.includes("how many") || text.includes("customers"))) {
    return {
      message: "Here are customers matching your Mumbai criteria.",
      intent: "find_customers",
      agentPlan: ["Filter customers in Mumbai", "Show matching count and sample"],
      action: {
        type: "find_customers",
        filters: { minSpend: null, maxSpend: null, city: "Mumbai", minOrders: null, inactiveDays: null },
        description: "Customers in Mumbai",
      },
      plan: ["Filter customers in Mumbai", "Show matching count and sample"],
      proposal: null,
      awaitingApproval: false,
    };
  }

  if (text.includes("analytics") || text.includes("performance") || text.includes("funnel")) {
    return {
      message: "Here's a snapshot of your marketing funnel performance.",
      intent: "show_analytics",
      agentPlan: null,
      action: {
        type: "show_analytics",
        metric: "funnel",
        insight: "Track delivery and engagement across your campaigns",
        highlightLabel: "Funnel",
        highlightValue: "Live",
        trend: "up",
      },
      plan: [],
      proposal: null,
      awaitingApproval: false,
    };
  }

  if (text.includes("segment") && (text.includes("high") || text.includes("spender"))) {
    return {
      message: "I'll create a segment for high-spending customers. Review and approve below.",
      intent: "create_segment",
      agentPlan: [
        "Define spend threshold rules",
        "Preview matching customers",
        "Create segment on approval",
      ],
      action: {
        type: "create_segment",
        segment: {
          name: "High Spenders",
          rules: {
            operator: "AND",
            conditions: [{ field: "totalSpend", operator: "gte", value: 50000 }],
          },
          description: "Customers with lifetime spend over 50,000 rupees",
        },
      },
      plan: [
        "Define spend threshold rules",
        "Preview matching customers",
        "Create segment on approval",
      ],
      proposal: null,
      awaitingApproval: true,
    };
  }

  if (text.includes("inactive") || text.includes("win back") || text.includes("90")) {
    return {
      message:
        "I'll set up a win-back campaign for customers inactive 90+ days. Review the plan and approve when ready.",
      intent: "create_campaign",
      agentPlan: [
        "Segment customers inactive 90+ days",
        "Draft WhatsApp re-engagement message",
        "Launch campaign after your approval",
      ],
      action: {
        type: "create_campaign",
        segment: {
          name: "Inactive 90+ Days",
          rules: {
            operator: "AND",
            conditions: [{ field: "daysSinceLastOrder", operator: "gte", value: 90 }],
          },
        },
        campaign: {
          name: "Win-Back Re-engagement",
          message:
            "Hi {{name}}! We miss you at our store. Come back this week for 15% off your next order.",
          channel: "WhatsApp",
          channelReasoning: "WhatsApp has the best open rates for win-back offers in India.",
        },
      },
      plan: [
        "Segment customers inactive 90+ days",
        "Draft WhatsApp re-engagement message",
        "Launch campaign after your approval",
      ],
      proposal: {
        segment: {
          name: "Inactive 90+ Days",
          rules: {
            operator: "AND",
            conditions: [{ field: "daysSinceLastOrder", operator: "gte", value: 90 }],
          },
        },
        campaign: {
          name: "Win-Back Re-engagement",
          message:
            "Hi {{name}}! We miss you at our store. Come back this week for 15% off your next order.",
          channel: "WhatsApp",
          channelReasoning: "WhatsApp has the best open rates for win-back offers in India.",
        },
      },
      awaitingApproval: true,
    };
  }

  if (text.includes("premium") || text.includes("high value") || text.includes("vip")) {
    return {
      message: "Here's a targeted plan for your premium customer segment.",
      intent: "create_campaign",
      agentPlan: [
        "Segment high-value customers (spend over 50,000)",
        "Draft exclusive VIP offer message",
        "Launch after your approval",
      ],
      action: {
        type: "create_campaign",
        segment: {
          name: "Premium VIP Customers",
          rules: {
            operator: "AND",
            conditions: [{ field: "totalSpend", operator: "gte", value: 50000 }],
          },
        },
        campaign: {
          name: "Premium VIP Exclusive",
          message:
            "Hi {{name}}! As a valued customer, enjoy early access to our new collection with 20% off.",
          channel: "WhatsApp",
          channelReasoning: "High-value customers respond best to personalized WhatsApp offers.",
        },
      },
      plan: [
        "Segment high-value customers (spend over 50,000)",
        "Draft exclusive VIP offer message",
        "Launch after your approval",
      ],
      proposal: {
        segment: {
          name: "Premium VIP Customers",
          rules: {
            operator: "AND",
            conditions: [{ field: "totalSpend", operator: "gte", value: 50000 }],
          },
        },
        campaign: {
          name: "Premium VIP Exclusive",
          message:
            "Hi {{name}}! As a valued customer, enjoy early access to our new collection with 20% off.",
          channel: "WhatsApp",
          channelReasoning: "High-value customers respond best to personalized WhatsApp offers.",
        },
      },
      awaitingApproval: true,
    };
  }

  if (text.includes("analyze") || text.includes("insight")) {
    return {
      message: "Here's an analysis of your customer base based on current CRM data.",
      intent: "analyze_customers",
      agentPlan: null,
      action: {
        type: "analyze_customers",
        analysis: {
          title: "Customer Base Overview",
          insights: [
            { label: "Total customers", value: "500", trend: "up", description: "Active CRM database" },
            { label: "Top city", value: "Mumbai", trend: "neutral", description: "Highest concentration" },
            { label: "Avg spend tier", value: "Mid-tier", trend: "up", description: "Majority spend 1K-10K" },
          ],
        },
      },
      plan: [],
      proposal: null,
      awaitingApproval: false,
    };
  }

  return null;
}

const OPERATOR_MAP: Record<string, string> = {
  gte: ">=",
  lte: "<=",
  gt: ">",
  lt: "<",
  eq: "==",
  in: "==",
  ne: "!=",
};

const FIELD_MAP: Record<string, string> = {
  daysSinceLastOrder: "daysSinceLastPurchase",
};

export function proposalToSegmentRules(proposal: GPTProposal) {
  const conditions = proposal.segment.rules?.conditions ?? [];
  const rules = conditions.map((c) => ({
    field: FIELD_MAP[c.field] ?? c.field,
    operator: OPERATOR_MAP[c.operator] ?? c.operator,
    value: c.value,
  }));
  return {
    rules,
    ruleLogic: (proposal.segment.rules?.operator ?? "AND") as "AND" | "OR",
  };
}

export function segmentActionToRules(segment: {
  rules?: {
    operator?: "AND" | "OR";
    conditions?: GPTCondition[];
  };
}) {
  const conditions = segment.rules?.conditions ?? [];
  const rules = conditions.map((c) => ({
    field: FIELD_MAP[c.field] ?? c.field,
    operator: OPERATOR_MAP[c.operator] ?? c.operator,
    value: c.value,
  }));
  return {
    rules,
    ruleLogic: (segment.rules?.operator ?? "AND") as "AND" | "OR",
  };
}

export function normalizeChannel(channel: string): string {
  const map: Record<string, string> = {
    whatsapp: "whatsapp",
    sms: "sms",
    email: "email",
    rcs: "rcs",
  };
  return map[channel.toLowerCase()] ?? channel.toLowerCase();
}

export function formatConditionPill(condition: GPTCondition): string {
  const field = FIELD_MAP[condition.field] ?? condition.field;
  const op = OPERATOR_MAP[condition.operator] ?? condition.operator;
  const val = condition.value;

  if (field === "totalSpend") {
    const amount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(val));
    if (op === ">=") return `Spend ≥ ${amount}`;
    if (op === "<=") return `Spend ≤ ${amount}`;
    if (op === ">") return `Spend > ${amount}`;
    if (op === "<") return `Spend < ${amount}`;
  }
  if (field === "daysSinceLastPurchase") {
    if (op === ">=") return `Inactive ${val}+ days`;
    if (op === "<=") return `Active within ${val} days`;
  }
  if (field === "daysSinceCreation") {
    if (op === ">=") return `Joined ${val}+ days ago`;
    if (op === "<=") return `Joined within ${val} days`;
  }
  if (field === "orderCount") {
    if (op === ">=") return `Orders ≥ ${val}`;
    if (op === "<=") return `Orders ≤ ${val}`;
  }
  if (field === "city") return `City: ${val}`;
  return `${field} ${op} ${val}`;
}

export function previewMessage(message: string, _channel: string): string {
  return message
    .replace(/\{\{name\}\}/g, "Rajesh")
    .replace(/\{\{city\}\}/g, "Mumbai");
}

export function filterCustomersByActionFilters(
  customers: import("./api").Customer[],
  filters: {
    minSpend?: number | null;
    maxSpend?: number | null;
    city?: string | null;
    minOrders?: number | null;
    inactiveDays?: number | null;
  }
) {
  const now = Date.now();
  return customers.filter((c) => {
    if (filters.minSpend != null && c.totalSpend < filters.minSpend) return false;
    if (filters.maxSpend != null && c.totalSpend > filters.maxSpend) return false;
    if (filters.city && c.city?.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.minOrders != null && c.orderCount < filters.minOrders) return false;
    if (filters.inactiveDays != null) {
      const last = new Date(c.lastOrderDate).getTime();
      const days = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      if (days < filters.inactiveDays) return false;
    }
    return true;
  });
}
