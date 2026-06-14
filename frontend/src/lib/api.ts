import { invalidateCache } from "./queryCache";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Types ──
export interface SegmentRule {
  id?: string;
  field: string;
  operator: string;
  value: string | number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  totalSpend: number;
  orderCount: number;
  lastOrderDate: string;
  createdAt: string;
  orders?: Order[];
}

export interface Order {
  id: string;
  customerId: string;
  amount: number;
  items: { name: string; quantity: number; price: number }[];
  purchasedAt: string;
}

export interface Segment {
  id: string;
  name: string;
  rules: SegmentRule[];
  ruleLogic: "AND" | "OR";
  customerCount: number;
  percentOfTotal: number;
  createdAt: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  read: number;
  clicked: number;
  attributed: number;
}

export interface Campaign {
  id: string;
  name: string;
  segmentId: string;
  segmentName: string;
  channel: "whatsapp" | "sms" | "email" | "rcs";
  message: string;
  status: string;
  stats: CampaignStats;
  createdAt: string;
  sentAt: string | null;
}

export interface DashboardData {
  totalCustomers: number;
  totalOrders: number;
  activeCampaigns: number;
  messagesSentThisMonth: number;
  revenueInfluenced: number;
  deliveryRate: number;
  customersTrend: number;
  ordersTrend: number;
  campaignsTrend: number;
  messagesTrend: number;
  revenueTrend: number;
  funnel: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  cityDistribution: Record<string, number>;
  sparklines: {
    customers: number[];
    orders: number[];
    campaigns: number[];
    messages: number[];
    revenue: number[];
  };
}

export interface FunnelStats {
  sent: number;
  delivered: number;
  opened: number;
  read: number;
  clicked: number;
  failed: number;
}

export interface AnalyticsKpis {
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  failureRate: number;
  failed: number;
}

export interface AnalyticsData {
  timeSeries: {
    date: string;
    label: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }[];
  heatmap: {
    days: string[];
    hours: string[];
    data: { day: string; hour: string; value: number }[];
  };
  funnel: FunnelStats;
  channels: Record<"whatsapp" | "sms" | "email" | "rcs", FunnelStats>;
  kpis: AnalyticsKpis;
  attributedOrders: number;
  days: number;
}

export interface CountsData {
  customers: number;
  segments: number;
  campaigns: number;
}

export type SuggestField = "campaignName" | "campaignMessage";
export type MessageTone = "friendly" | "professional" | "urgent";

export interface AiSuggestContext {
  segmentName?: string;
  channel?: string;
  tone?: MessageTone;
}

export interface SuggestionItem {
  suggestion: string;
  confidence: number;
  reason: string;
}

export interface SuggestResponse {
  suggestion: string;
  suggestions: SuggestionItem[];
  confidence: number;
  reason: string;
}

export interface ChannelSuggestResponse {
  channel: "whatsapp" | "sms" | "email" | "rcs";
  confidence: number;
  reason: string;
  stats?: { openRate: number; deliveryRate: number; clickRate: number };
}

export interface CustomerCommunication {
  id: string;
  channel: string;
  status: string;
  message: string;
  timestamp: string;
  campaignName: string;
  campaignId: string;
  events: { eventType: string; timestamp: string }[];
  attributedOrderId: string | null;
  attributedAmount: number | null;
}

export interface CampaignStreamEvent {
  type: "communication_event" | "campaign_completed" | "connected";
  campaignId: string;
  communicationId?: string;
  customerId?: string;
  customerName?: string;
  eventType?: string;
  timestamp: string;
  attributed?: boolean;
}

export interface SegmentSuggestResponse {
  name: string;
  ruleLogic: "AND" | "OR";
  rules: SegmentRule[];
  reason: string;
  confidence: number;
}

// ── API calls ──
export const api = {
  getDashboard: () => request<DashboardData>("/api/dashboard"),

  getCounts: () => request<CountsData>("/api/counts"),

  getAnalytics: (days: number) => request<AnalyticsData>(`/api/analytics?days=${days}`),

  getCustomers: (params?: { search?: string; city?: string; minSpend?: number; maxSpend?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.city && params.city !== "All") q.set("city", params.city);
    if (params?.minSpend) q.set("minSpend", String(params.minSpend));
    if (params?.maxSpend) q.set("maxSpend", String(params.maxSpend));
    const qs = q.toString();
    return request<Customer[]>(`/api/customers${qs ? `?${qs}` : ""}`);
  },

  getCustomerCommunications: (customerId: string) =>
    request<CustomerCommunication[]>(`/api/customers/${customerId}/communications`),

  getSegments: () => request<Segment[]>("/api/segments"),

  getSegmentPreview: (id: string) =>
    request<{ segment: Segment; matchCount: number; customers: Customer[] }>(
      `/api/segments/${id}/preview`
    ),

  createSegment: (data: { name: string; rules: SegmentRule[]; ruleLogic: "AND" | "OR" }) =>
    request<Segment>("/api/segments", { method: "POST", body: JSON.stringify(data) }).then(
      (segment) => {
        invalidateCache("segments");
        invalidateCache("dashboard");
        invalidateCache("counts");
        return segment;
      }
    ),

  deleteSegment: (id: string) =>
    request<{ ok: boolean }>(`/api/segments/${id}`, { method: "DELETE" }).then((result) => {
      invalidateCache("segments");
      invalidateCache("campaigns");
      invalidateCache("dashboard");
      invalidateCache("counts");
      return result;
    }),

  getCampaigns: () => request<Campaign[]>("/api/campaigns"),

  createCampaign: (data: {
    name: string;
    segmentId: string;
    message: string;
    channel: string;
  }) =>
    request<Campaign>("/api/campaigns", { method: "POST", body: JSON.stringify(data) }).then(
      (campaign) => {
        invalidateCache("campaigns");
        invalidateCache("dashboard");
        invalidateCache("counts");
        return campaign;
      }
    ),

  deleteCampaign: (id: string) =>
    request<{ ok: boolean }>(`/api/campaigns/${id}`, { method: "DELETE" }).then((result) => {
      invalidateCache("campaigns");
      invalidateCache("dashboard");
      invalidateCache("counts");
      return result;
    }),

  sendCampaign: (id: string) =>
    request<{ message: string; count: number }>(`/api/campaigns/${id}/send`, { method: "POST" }),

  getCampaignStats: (id: string) => request<CampaignStats>(`/api/campaigns/${id}/stats`),

  getCampaignEventsRecent: (id: string, limit = 40) =>
    request<CampaignStreamEvent[]>(`/api/campaigns/${id}/events/recent?limit=${limit}`),

  suggestSegment: (intent: string, signal?: AbortSignal) =>
    request<SegmentSuggestResponse>("/api/ai/suggest-segment", {
      method: "POST",
      body: JSON.stringify({ intent }),
      signal,
    }),

  suggest: (
    data: {
      field: SuggestField;
      partial: string;
      context?: AiSuggestContext;
    },
    signal?: AbortSignal
  ) =>
    request<SuggestResponse>("/api/ai/suggest", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),

  suggestChannel: (segmentId: string, signal?: AbortSignal) =>
    request<ChannelSuggestResponse>("/api/ai/suggest-channel", {
      method: "POST",
      body: JSON.stringify({ segmentId }),
      signal,
    }),
};
