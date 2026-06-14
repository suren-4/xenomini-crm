import type { PrismaClient } from "@prisma/client";
import {
  enrichCustomer,
  filterCustomersByRules,
  type SegmentRule,
} from "./segments";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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

export type AgentIntent =
  | "create_campaign"
  | "create_segment"
  | "analyze_customers"
  | "show_analytics"
  | "find_customers"
  | "campaign_stats"
  | "general";

export interface AgentProposal {
  segment: {
    name: string;
    rules: {
      operator: "AND" | "OR";
      conditions: { field: string; operator: string; value: string | number }[];
    };
  };
  campaign: {
    name: string;
    message: string;
    channel: string;
    channelReasoning?: string;
  };
}

export type AgentAction = Record<string, unknown>;

export interface AgentChatResponse {
  message: string;
  intent: AgentIntent;
  agentPlan: string[] | null;
  action: AgentAction | null;
  plan: string[];
  proposal: AgentProposal | null;
  awaitingApproval: boolean;
}

export interface AgentExecuteResult {
  segmentId: string;
  campaignId: string;
  count: number;
  steps: { label: string; status: "done"; detail: string }[];
}

const SYSTEM_PROMPT_BASE = `You are CampaignGPT, an intelligent AI assistant built into Xeno CRM — a marketing CRM for Indian D2C brands.

You have access to real CRM data and can perform these actions:

ACTIONS YOU CAN TAKE:
1. create_campaign — create and send a marketing campaign
2. create_segment — create a customer segment with rules
3. analyze_customers — analyze customer data and show insights
4. show_analytics — surface performance metrics and trends
5. find_customers — search and filter customers by criteria
6. campaign_stats — show stats for a specific campaign
7. general — answer questions, give advice, explain data

ALWAYS respond with valid JSON only:

{
  "message": "conversational response (1-3 sentences, friendly, concise)",
  "intent": "create_campaign | create_segment | analyze_customers | show_analytics | find_customers | campaign_stats | general",
  "agentPlan": ["Step 1: description", "Step 2: description", "Step 3: description"] or null,
  "action": {
    "type": "create_campaign | create_segment | find_customers | show_analytics | analyze_customers | campaign_stats | general",
    ...type-specific fields...
  } or null
}

FOR create_campaign action:
{
  "type": "create_campaign",
  "segment": { "name": "...", "rules": { "operator": "AND", "conditions": [...] } },
  "campaign": { "name": "...", "message": "Hi {{name}}! ...", "channel": "WhatsApp|SMS|Email|RCS", "channelReasoning": "why" }
}

FOR create_segment action:
{
  "type": "create_segment",
  "segment": { "name": "...", "rules": { "operator": "AND|OR", "conditions": [...] }, "description": "plain English who this targets" }
}

FOR find_customers action:
{
  "type": "find_customers",
  "filters": { "minSpend": number|null, "maxSpend": number|null, "city": string|null, "minOrders": number|null, "inactiveDays": number|null },
  "description": "who we are looking for"
}

FOR show_analytics action:
{
  "type": "show_analytics",
  "metric": "funnel|engagement|channels|campaigns|heatmap",
  "insight": "key insight to highlight",
  "highlightValue": "number or percentage string",
  "highlightLabel": "metric label",
  "trend": "up|down|neutral"
}

FOR analyze_customers action:
{
  "type": "analyze_customers",
  "analysis": {
    "title": "analysis title",
    "insights": [{ "label": "...", "value": "...", "trend": "up|down|neutral", "description": "..." }]
  }
}

FOR campaign_stats action:
{
  "type": "campaign_stats",
  "campaignName": "name to look up (partial match ok)"
}

FOR general action:
{ "type": "general" }

CONTEXT YOU HAVE:
- 500 customers across Indian cities
- Top cities: Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Pune, Kolkata
- Segment fields: totalSpend, city, daysSinceLastOrder, orderCount, daysSinceCreation
- Channels: WhatsApp (best engagement), SMS (quick reach), Email (detailed), RCS (rich media)
- Always use {{name}} in messages
- Amounts in Indian Rupees (INR)
- Use Indian context and festivals

BEHAVIOR:
- Be proactive — suggest related actions
- After creating a segment, offer to create a campaign for it
- After showing analytics, suggest actionable next steps
- Remember conversation context
- Use CURRENT SCREEN CONTEXT when the user refers to "this campaign", "this customer", or the current page
- Be concise — max 2-3 sentences
- Never repeat the same opening line
- Never claim you already executed — user must approve actions`;

function buildAgentPrompt(crmContext: string) {
  return `${SYSTEM_PROMPT_BASE}

LIVE CRM DATA (as of now):
${crmContext}`;
}

export async function getAgentCrmContext(prisma: PrismaClient): Promise<string> {
  const [totalCustomers, totalOrders, segments, campaigns, customers, commEvents] =
    await Promise.all([
      prisma.customer.count(),
      prisma.order.count(),
      prisma.segment.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.campaign.findMany({
        include: { communications: { include: { events: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.customer.findMany({
        include: {
          orders: { orderBy: { purchasedAt: "desc" }, take: 1 },
          _count: { select: { orders: true } },
        },
      }),
      prisma.communicationEvent.findMany({
        where: { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

  const enriched = customers.map(enrichCustomer);
  const segmentSummaries = segments.map((segment) => {
    const rules = JSON.parse(segment.rules) as SegmentRule[];
    const logic = (segment.ruleLogic as "AND" | "OR") || "AND";
    const count = filterCustomersByRules(enriched, rules, logic).length;
    return `- ${segment.name}: ${count} customers`;
  });

  const activeCampaigns = campaigns.filter(
    (c) => c.status === "sending" || c.status === "scheduled"
  ).length;

  const messagesSentMTD = commEvents.filter((e) => e.eventType === "sent").length;

  const funnel = {
    sent: commEvents.filter((e) => e.eventType === "sent").length,
    delivered: commEvents.filter((e) => e.eventType === "delivered").length,
    opened: commEvents.filter((e) => e.eventType === "opened").length,
    clicked: commEvents.filter((e) => e.eventType === "clicked").length,
  };

  const campaignSummaries = campaigns.slice(0, 3).map((c) => {
    const sent = c.communications.filter((com) =>
      com.events.some((e) => e.eventType === "sent")
    ).length;
    return `- ${c.name}: ${c.status}, ${sent} sent`;
  });

  return [
    `- Total customers: ${totalCustomers}`,
    `- Total orders: ${totalOrders}`,
    `- Active campaigns: ${activeCampaigns}`,
    `- Messages sent this month: ${messagesSentMTD}`,
    ``,
    `EXISTING SEGMENTS:`,
    segmentSummaries.length ? segmentSummaries.join("\n") : "- (none yet)",
    ``,
    `RECENT CAMPAIGNS:`,
    campaignSummaries.length ? campaignSummaries.join("\n") : "- (none yet)",
    ``,
    `FUNNEL PERFORMANCE:`,
    `- Sent: ${funnel.sent}`,
    `- Delivered: ${funnel.delivered}`,
    `- Opened: ${funnel.opened}`,
    `- Clicked: ${funnel.clicked}`,
  ].join("\n");
}

function parseGroqError(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; code?: string };
    };
    const code = parsed.error?.code;
    const msg = parsed.error?.message ?? "Groq request failed";

    if (code === "invalid_api_key") {
      return "Groq API key is invalid. Create a new key at console.groq.com, add GROQ_API_KEY to backend/.env, then restart the backend.";
    }
    if (code === "rate_limit_exceeded") {
      return "Groq rate limit reached. Wait a moment and try again.";
    }
    return msg;
  } catch {
    return "Groq request failed. Check backend logs and your API key.";
  }
}

function normalizeIntent(raw: string | undefined): AgentIntent {
  const valid: AgentIntent[] = [
    "create_campaign",
    "create_segment",
    "analyze_customers",
    "show_analytics",
    "find_customers",
    "campaign_stats",
    "general",
  ];
  if (raw && valid.includes(raw as AgentIntent)) return raw as AgentIntent;
  return "general";
}

function actionToProposal(action: AgentAction | null): AgentProposal | null {
  if (!action || action.type !== "create_campaign") return null;
  const segment = action.segment as AgentProposal["segment"] | undefined;
  const campaign = action.campaign as AgentProposal["campaign"] | undefined;
  if (!segment?.name || !campaign?.name) return null;
  return { segment, campaign };
}

function normalizeResponse(parsed: Record<string, unknown>): AgentChatResponse {
  const intent = normalizeIntent(parsed.intent as string | undefined);
  const agentPlan = Array.isArray(parsed.agentPlan)
    ? (parsed.agentPlan as string[])
    : Array.isArray(parsed.plan)
      ? (parsed.plan as string[])
      : null;

  const action =
    parsed.action && typeof parsed.action === "object"
      ? (parsed.action as AgentAction)
      : null;

  const proposal =
    actionToProposal(action) ??
    (parsed.proposal && typeof parsed.proposal === "object"
      ? (parsed.proposal as AgentProposal)
      : null);

  const awaitingApproval =
    intent === "create_campaign" || intent === "create_segment"
      ? Boolean(proposal || (action && action.type === "create_segment"))
      : false;

  return {
    message: (parsed.message as string) ?? "How can I help with your CRM today?",
    intent,
    agentPlan,
    action,
    plan: agentPlan ?? [],
    proposal,
    awaitingApproval,
  };
}

export async function chatWithAgent(
  prisma: PrismaClient,
  userMessage: string,
  history: { role: string; content: string }[],
  clientContext?: string
): Promise<AgentChatResponse> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey || apiKey === "your_groq_key_here") {
    throw new Error(
      "Groq API key not configured. Add GROQ_API_KEY to backend/.env (get a free key at console.groq.com), then restart the backend."
    );
  }

  const crmContext = clientContext?.trim() || (await getAgentCrmContext(prisma));
  const systemPrompt = buildAgentPrompt(crmContext);

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
    { role: "user", content: userMessage },
  ];

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1400,
      temperature: 0.6,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Groq error:", errText);
    throw new Error(parseGroqError(errText));
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const text = data.choices[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned an empty response. Please try again.");
  }

  try {
    return normalizeResponse(JSON.parse(text) as Record<string, unknown>);
  } catch {
    return {
      message: text,
      intent: "general",
      agentPlan: null,
      action: { type: "general" },
      plan: [],
      proposal: null,
      awaitingApproval: false,
    };
  }
}

export function proposalToSegmentRules(proposal: AgentProposal) {
  const conditions = proposal.segment.rules?.conditions ?? [];
  const rules: SegmentRule[] = conditions.map((c) => ({
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
    conditions?: { field: string; operator: string; value: string | number }[];
  };
}) {
  const conditions = segment.rules?.conditions ?? [];
  const rules: SegmentRule[] = conditions.map((c) => ({
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

export async function executeAgentProposal(
  prisma: PrismaClient,
  proposal: AgentProposal,
  processSend: (
    campaignId: string,
    campaign: { channel: string; message: string },
    customers: { id: string; name: string; city: string | null }[]
  ) => Promise<void>,
  getMatches: (segmentId: string) => Promise<{
    matches: { id: string; name: string; city: string | null }[];
  } | null>
): Promise<AgentExecuteResult> {
  const { rules, ruleLogic } = proposalToSegmentRules(proposal);

  const segment = await prisma.segment.create({
    data: {
      name: proposal.segment.name,
      rules: JSON.stringify(rules),
      ruleLogic,
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      name: proposal.campaign.name,
      segmentId: segment.id,
      message: proposal.campaign.message,
      channel: normalizeChannel(proposal.campaign.channel),
      tokens: JSON.stringify({}),
      status: "draft",
    },
  });

  const result = await getMatches(segment.id);
  const customers = result?.matches ?? [];

  if (customers.length === 0) {
    throw new Error("No customers match this segment. Try adjusting the rules.");
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "sending", sentAt: new Date() },
  });

  void processSend(campaign.id, campaign, customers).catch(async (err) => {
    console.error("Agent campaign send failed:", err);
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "draft" },
    });
  });

  return {
    segmentId: segment.id,
    campaignId: campaign.id,
    count: customers.length,
    steps: [
      { label: "Segment created", status: "done", detail: proposal.segment.name },
      { label: "Campaign drafted", status: "done", detail: proposal.campaign.name },
      {
        label: "Campaign launched",
        status: "done",
        detail: `${customers.length} customers via ${proposal.campaign.channel}`,
      },
    ],
  };
}
