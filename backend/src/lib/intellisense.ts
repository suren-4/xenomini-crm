import type { PrismaClient } from "@prisma/client";
import {
  aggregateChannels,
  buildRecentDayKeys,
  type AnalyticsChannel,
  ANALYTICS_CHANNELS,
} from "./analytics";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TIMEOUT_MS = 900;

export type SuggestField = "campaignName" | "campaignMessage";
export type MessageTone = "friendly" | "professional" | "urgent";

export interface SuggestContext {
  segmentName?: string;
  channel?: string;
  tone?: MessageTone;
}

export interface SuggestionItem {
  suggestion: string;
  confidence: number;
  reason: string;
}

export interface SuggestResult {
  suggestion: string;
  suggestions: SuggestionItem[];
  confidence: number;
  reason: string;
}

export interface ChannelSuggestResult {
  channel: AnalyticsChannel;
  confidence: number;
  reason: string;
  stats?: { openRate: number; deliveryRate: number; clickRate: number };
}

function channelLabel(ch: AnalyticsChannel): string {
  const labels: Record<AnalyticsChannel, string> = {
    whatsapp: "WhatsApp",
    sms: "SMS",
    email: "Email",
    rcs: "RCS",
  };
  return labels[ch];
}

function openRate(stats: { sent: number; opened: number; delivered: number }): number {
  const base = stats.delivered || stats.sent || 1;
  return Math.round((stats.opened / base) * 1000) / 10;
}

function clickRate(stats: { opened: number; clicked: number }): number {
  const base = stats.opened || 1;
  return Math.round((stats.clicked / base) * 1000) / 10;
}

function deliveryRate(stats: { sent: number; delivered: number }): number {
  const base = stats.sent || 1;
  return Math.round((stats.delivered / base) * 1000) / 10;
}

function toContinuation(partial: string, suggestion: string): string {
  const raw = suggestion.trimStart();
  if (!raw) return "";
  if (raw.toLowerCase().startsWith(partial.toLowerCase())) {
    return raw.slice(partial.length);
  }
  const trimmed = partial.trim();
  if (trimmed && raw.toLowerCase().startsWith(trimmed.toLowerCase())) {
    return raw.slice(trimmed.length);
  }
  return raw;
}

function normalizeMessageContinuation(partial: string, text: string): string {
  const cont = toContinuation(partial, text);
  if (!cont) return "";
  if (cont.startsWith("\n") || partial.endsWith("\n")) return cont;
  return `\n${cont}`;
}

function packResult(items: SuggestionItem[]): SuggestResult {
  const filtered = items.filter((i) => i.suggestion.length > 0);
  const first = filtered[0] ?? { suggestion: "", confidence: 0, reason: "" };
  return {
    suggestion: first.suggestion,
    suggestions: filtered,
    confidence: first.confidence,
    reason: first.reason,
  };
}

function heuristicCampaignNames(partial: string, context?: SuggestContext): SuggestResult {
  const trimmed = partial.trim();
  if (!trimmed) return packResult([]);

  const segment = context?.segmentName?.trim();
  const candidates: SuggestionItem[] = [
    {
      suggestion: toContinuation(partial, `${trimmed} Sale 2026`),
      confidence: 0.82,
      reason: "Seasonal sale naming pattern",
    },
    {
      suggestion: toContinuation(
        partial,
        segment ? `${trimmed} Sale - ${segment}` : `${trimmed} Outreach Campaign`
      ),
      confidence: 0.78,
      reason: segment ? "Segment-targeted campaign name" : "Standard outreach pattern",
    },
    {
      suggestion: toContinuation(partial, `${trimmed} Re-Engagement Campaign`),
      confidence: 0.74,
      reason: "Re-engagement naming pattern",
    },
  ].filter((c) => c.suggestion.length > 0 && (partial + c.suggestion).length <= 60);

  return packResult(candidates);
}

const TONE_MESSAGES: Record<MessageTone, (segment: string, partial: string) => SuggestionItem> = {
  friendly: (segment, partial) => ({
    suggestion: normalizeMessageContinuation(
      partial,
      "\n\nWe miss you! Enjoy 20% OFF this weekend in {{city}}.\n\nUse code COMEBACK20."
    ),
    confidence: 0.8,
    reason: "Friendly win-back tone with promo code",
  }),
  professional: (segment, partial) => ({
    suggestion: normalizeMessageContinuation(
      partial,
      "\n\nWe would like to offer you an exclusive 20% discount on your next purchase. Use code SAVE20 at checkout."
    ),
    confidence: 0.77,
    reason: "Professional tone suitable for premium segments",
  }),
  urgent: (segment, partial) => ({
    suggestion: normalizeMessageContinuation(
      partial,
      "\n\n⏰ Limited time: 20% OFF ends Sunday! Shop now in {{city}} — code FLASH20."
    ),
    confidence: 0.75,
    reason: "Urgency-driven message for higher conversion",
  }),
};

function heuristicCampaignMessages(
  partial: string,
  context?: SuggestContext
): SuggestResult {
  const segment = context?.segmentName?.toLowerCase() ?? "";
  const tone = context?.tone ?? "friendly";
  const isInactive = segment.includes("inactive") || segment.includes("win");
  const isPremium = segment.includes("premium") || segment.includes("vip");

  const items: SuggestionItem[] = [];

  if (isInactive) {
    items.push(TONE_MESSAGES.friendly(segment, partial));
    items.push({
      suggestion: normalizeMessageContinuation(
        partial,
        "\n\nWe miss you.\nEnjoy 20% OFF this weekend.\n\nUse code COMEBACK20."
      ),
      confidence: 0.85,
      reason: "Win-back message for inactive customers",
    });
  } else if (isPremium) {
    items.push(TONE_MESSAGES.professional(segment, partial));
    items.push({
      suggestion: normalizeMessageContinuation(
        partial,
        "\n\nAs a valued customer, enjoy early access to our premium collection — plus 15% off your next order."
      ),
      confidence: 0.83,
      reason: "VIP-appropriate premium messaging",
    });
  } else if (partial.includes("{{name}}")) {
    items.push(TONE_MESSAGES[tone](segment, partial));
    items.push({
      suggestion: normalizeMessageContinuation(
        partial,
        "\n\nWe have an exclusive offer waiting for you in {{city}}. Shop now and save 20% with code SAVE20."
      ),
      confidence: 0.76,
      reason: "Personalized offer with city token",
    });
  } else {
    items.push(TONE_MESSAGES[tone](segment, partial));
  }

  const unique = items.filter(
    (item, idx, arr) =>
      item.suggestion.length > 0 &&
      !partial.endsWith(item.suggestion.trimStart()) &&
      arr.findIndex((x) => x.suggestion === item.suggestion) === idx
  );

  return packResult(unique.slice(0, 3));
}

async function callGroqSuggest(
  field: SuggestField,
  partial: string,
  context?: SuggestContext
): Promise<SuggestResult | null> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === "your_groq_key_here") return null;

  const toneNote =
    field === "campaignMessage" && context?.tone
      ? ` Tone: ${context.tone}.`
      : "";

  const fieldInstructions =
    field === "campaignName"
      ? `Generate 3 different continuation options to append after the user's partial campaign name.
Do NOT repeat what they already typed. Max total name length 60 chars each.
Return JSON: {"suggestions":[{"suggestion":"...continuation only...","confidence":0.0-1.0,"reason":"brief"}, ...]}`
      : `Generate 3 different continuation options to append after the user's partial message.
Do NOT rewrite existing text. Max 2 sentences per continuation.${toneNote}
Use {{name}} and {{city}} placeholders when appropriate.
Return JSON: {"suggestions":[{"suggestion":"...continuation only...","confidence":0.0-1.0,"reason":"brief"}, ...]}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a marketing copy assistant for Xeno CRM. ${fieldInstructions}`,
          },
          {
            role: "user",
            content: JSON.stringify({ field, partial, context: context ?? {} }),
          },
        ],
        max_tokens: 280,
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const text = data.choices[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as {
      suggestions?: { suggestion?: string; confidence?: number; reason?: string }[];
      suggestion?: string;
      confidence?: number;
      reason?: string;
    };

    const rawList = parsed.suggestions ?? [
      {
        suggestion: parsed.suggestion,
        confidence: parsed.confidence,
        reason: parsed.reason,
      },
    ];

    const items: SuggestionItem[] = rawList
      .map((item) => {
        const raw = String(item.suggestion ?? "");
        const cont =
          field === "campaignName"
            ? toContinuation(partial, raw.trimStart())
            : normalizeMessageContinuation(partial, raw);
        return {
          suggestion: cont,
          confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.8)),
          reason: String(item.reason ?? "AI-generated suggestion"),
        };
      })
      .filter((i) => i.suggestion.length > 0);

    if (!items.length) return null;
    return packResult(items.slice(0, 3));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function suggestField(
  field: SuggestField,
  partial: string,
  context?: SuggestContext
): Promise<SuggestResult> {
  if (!partial.trim()) {
    return packResult([]);
  }

  const groq = await callGroqSuggest(field, partial, context);
  if (groq?.suggestions.length) return groq;

  return field === "campaignName"
    ? heuristicCampaignNames(partial, context)
    : heuristicCampaignMessages(partial, context);
}

async function channelStatsForSegment(
  prisma: PrismaClient,
  segmentId: string,
  segmentName: string
) {
  const sentCampaigns = await prisma.campaign.findMany({
    where: {
      OR: [{ segmentId }, { segment: { name: segmentName } }],
      status: { not: "draft" },
    },
    select: {
      channel: true,
      communications: {
        select: {
          channel: true,
          events: { select: { eventType: true } },
        },
      },
    },
  });

  const channelEvents: { eventType: string; channel: string }[] = [];
  for (const campaign of sentCampaigns) {
    for (const comm of campaign.communications) {
      const ch = comm.channel || campaign.channel;
      for (const ev of comm.events) {
        channelEvents.push({ eventType: ev.eventType, channel: ch });
      }
    }
  }

  return { channelEvents, campaignCount: sentCampaigns.length };
}

export async function suggestChannel(
  prisma: PrismaClient,
  segmentId: string
): Promise<ChannelSuggestResult> {
  const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
  if (!segment) {
    return {
      channel: "whatsapp",
      confidence: 0.6,
      reason: "WhatsApp is the default high-engagement channel",
    };
  }

  const segmentLower = segment.name.toLowerCase();
  const { channelEvents: segmentEvents, campaignCount } = await channelStatsForSegment(
    prisma,
    segmentId,
    segment.name
  );

  let channels = aggregateChannels(segmentEvents);
  let dataSource = "segment";

  const segmentSent = ANALYTICS_CHANNELS.reduce((n, ch) => n + channels[ch].sent, 0);

  if (segmentSent < 10) {
    const dayKeys = buildRecentDayKeys(90);
    const since = new Date(`${dayKeys[0]}T00:00:00`);
    const globalEvents = await prisma.communicationEvent.findMany({
      where: { timestamp: { gte: since } },
      select: {
        eventType: true,
        communication: { select: { channel: true } },
      },
    });
    channels = aggregateChannels(
      globalEvents.map((e) => ({
        eventType: e.eventType,
        channel: e.communication.channel,
      }))
    );
    dataSource = "global";
  }

  const scores = ANALYTICS_CHANNELS.map((ch) => {
    const stats = channels[ch];
    const open = openRate(stats);
    const click = clickRate(stats);
    const delivery = deliveryRate(stats);
    let score = open * 0.5 + click * 0.3 + delivery * 0.2;

    if (segmentLower.includes("inactive") || segmentLower.includes("win")) {
      if (ch === "whatsapp") score += 15;
      if (ch === "sms") score += 8;
    }
    if (segmentLower.includes("premium") || segmentLower.includes("vip")) {
      if (ch === "whatsapp") score += 10;
      if (ch === "email") score += 5;
    }
    if (segmentLower.includes("budget") || segmentLower.includes("new")) {
      if (ch === "sms") score += 8;
    }

    return { channel: ch, score, open, click, delivery, stats };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  let reason: string;
  if (dataSource === "segment" && campaignCount > 0) {
    reason = `${best.open}% open rate for "${segment.name}" campaigns on ${channelLabel(best.channel)} (${best.delivery}% delivery, ${best.click}% CTR)`;
  } else if (segmentLower.includes("inactive")) {
    reason = `${best.open}% historical open rate — ${channelLabel(best.channel)} works best for win-back outreach`;
  } else {
    reason = `${best.open}% open rate on ${channelLabel(best.channel)} for similar audiences (${best.delivery}% delivery)`;
  }

  const confidence = Math.min(0.95, Math.max(0.65, 0.65 + best.score / 200));

  return {
    channel: best.channel,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    stats: {
      openRate: best.open,
      deliveryRate: best.delivery,
      clickRate: best.click,
    },
  };
}
