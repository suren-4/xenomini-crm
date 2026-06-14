import "dotenv/config";
import { randomUUID } from "crypto";
import express, { Request, Response } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import {
  enrichCustomer,
  filterCustomersByRules,
  type SegmentRule,
  type EnrichedCustomer,
} from "./lib/segments";
import {
  aggregateEventsByDay,
  buildHeatmap,
  buildRecentDayKeys,
  buildTimeSeries,
  countsByDay,
  trendFromSeries,
  aggregateFunnel,
  aggregateChannels,
  buildKpis,
} from "./lib/analytics";
import { chatWithAgent, executeAgentProposal } from "./lib/campaigngpt";
import { suggestField, suggestChannel, type MessageTone } from "./lib/intellisense";
import { buildCommunicationUpdates } from "./lib/channelEvents";
import {
  publishCampaignEvent,
  subscribeCampaignStream,
} from "./lib/campaignEventBus";
import { suggestAudience } from "./lib/suggestSegment";

const app = express();
const prisma = new PrismaClient();

const COMMUNICATION_BATCH_SIZE = 100;

async function createCommunicationsBatched(
  records: {
    campaignId: string;
    customerId: string;
    channel: string;
    message: string;
    status: string;
  }[]
) {
  const withIds = records.map((record) => ({ id: randomUUID(), ...record }));
  for (let i = 0; i < withIds.length; i += COMMUNICATION_BATCH_SIZE) {
    await prisma.communication.createMany({
      data: withIds.slice(i, i + COMMUNICATION_BATCH_SIZE),
    });
  }
  return withIds;
}

app.use(cors());
app.use(express.json());

async function getEnrichedCustomers(): Promise<EnrichedCustomer[]> {
  const customers = await prisma.customer.findMany({
    include: {
      orders: { orderBy: { purchasedAt: "desc" }, take: 1 },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return customers.map(enrichCustomer);
}

async function getSegmentMatches(
  segmentId: string,
  preloaded?: EnrichedCustomer[]
) {
  const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
  if (!segment) return null;

  const rules = JSON.parse(segment.rules) as SegmentRule[];
  const logic = (segment.ruleLogic as "AND" | "OR") || "AND";
  const customers = preloaded ?? (await getEnrichedCustomers());
  const matches = filterCustomersByRules(customers, rules, logic);

  return { segment, matches };
}

async function processCampaignSend(
  campaignId: string,
  campaign: { channel: string; message: string },
  customers: { id: string; name: string; city: string | null }[]
) {
  const communicationData = customers.map((customer) => ({
    campaignId,
    customerId: customer.id,
    channel: campaign.channel,
    message: campaign.message
      .replace(/\{\{name\}\}/g, customer.name)
      .replace(/\{\{city\}\}/g, customer.city ?? ""),
    status: "queued",
  }));

  const communications = await createCommunicationsBatched(communicationData);

  const channelUrl = process.env.CHANNEL_SERVICE_URL || "http://localhost:3001";
  const callbackUrl = `${
    process.env.CRM_PUBLIC_URL || "http://localhost:3000"
  }/api/webhooks/channel-callback`;

  const response = await fetch(`${channelUrl}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignId,
      communications: communications.map((c) => ({
        id: c.id,
        customerId: c.customerId,
        channel: c.channel,
        message: c.message,
      })),
      crmCallbackUrl: callbackUrl,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Channel service rejected send (${response.status})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as { ok?: boolean };
  if (!result.ok) {
    throw new Error("Channel service returned unsuccessful response");
  }
}

function buildCampaignStats(
  communications: {
    status: string;
    attributedOrderId: string | null;
    events: { eventType: string }[];
  }[]
) {
  const hasEvent = (events: { eventType: string }[], type: string) =>
    events.some((e) => e.eventType === type);

  return {
    total: communications.length,
    sent: communications.filter(
      (c) => hasEvent(c.events, "sent") || c.status !== "queued"
    ).length,
    delivered: communications.filter((c) => hasEvent(c.events, "delivered")).length,
    failed: communications.filter((c) => hasEvent(c.events, "failed")).length,
    opened: communications.filter((c) => hasEvent(c.events, "opened")).length,
    read: communications.filter((c) => hasEvent(c.events, "read")).length,
    clicked: communications.filter((c) => hasEvent(c.events, "clicked")).length,
    attributed: communications.filter((c) => c.attributedOrderId).length,
  };
}

// ── Health ──
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "crm-backend" });
});

// ── Customers ──
app.get("/api/customers", async (req: Request, res: Response) => {
  try {
    const { search, minSpend, maxSpend, city } = req.query;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
        { city: { contains: String(search) } },
      ];
    }
    if (minSpend || maxSpend) {
      where.totalSpend = {
        ...(minSpend ? { gte: Number(minSpend) } : {}),
        ...(maxSpend ? { lte: Number(maxSpend) } : {}),
      };
    }
    if (city && city !== "All") where.city = String(city);

    const customers = await prisma.customer.findMany({
      where,
      include: { orders: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      customers.map((c) => {
        const enriched = enrichCustomer(c);
        return {
          ...enriched,
          lastOrderDate: enriched.lastOrderDate.toISOString(),
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          orders: c.orders.map((o) => ({
            ...o,
            items: JSON.parse(o.items),
            purchasedAt: o.purchasedAt.toISOString(),
            createdAt: o.createdAt.toISOString(),
          })),
        };
      })
    );
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/customers/bulk", async (req: Request, res: Response) => {
  try {
    const { customers } = req.body;
    const created = await prisma.customer.createMany({ data: customers });
    res.json({ created: created.count });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/customers/:id/communications", async (req: Request, res: Response) => {
  try {
    const communications = await prisma.communication.findMany({
      where: { customerId: req.params.id },
      include: {
        campaign: true,
        events: { orderBy: { timestamp: "asc" } },
        attributedOrder: true,
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    res.json(
      communications.map((c) => ({
        id: c.id,
        channel: c.channel,
        status: c.status,
        message: c.message,
        timestamp: (c.sentAt || c.createdAt).toISOString(),
        campaignName: c.campaign.name,
        campaignId: c.campaignId,
        events: c.events.map((e) => ({
          eventType: e.eventType,
          timestamp: e.timestamp.toISOString(),
        })),
        attributedOrderId: c.attributedOrderId,
        attributedAmount: c.attributedOrder?.amount ?? null,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Segments ──
app.get("/api/segments", async (_req: Request, res: Response) => {
  try {
    const segments = await prisma.segment.findMany({ orderBy: { createdAt: "desc" } });
    const [totalCustomers, customers] = await Promise.all([
      prisma.customer.count(),
      getEnrichedCustomers(),
    ]);

    const enriched = segments.map((segment) => {
      const rules = JSON.parse(segment.rules) as SegmentRule[];
      const logic = (segment.ruleLogic as "AND" | "OR") || "AND";
      const count = filterCustomersByRules(customers, rules, logic).length;
      return {
        ...segment,
        rules,
        ruleLogic: logic,
        customerCount: count,
        percentOfTotal: totalCustomers
          ? Math.round((count / totalCustomers) * 100)
          : 0,
        createdAt: segment.createdAt.toISOString(),
        updatedAt: segment.updatedAt.toISOString(),
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/segments", async (req: Request, res: Response) => {
  try {
    const { name, rules, ruleLogic = "AND" } = req.body;
    const segment = await prisma.segment.create({
      data: { name, rules: JSON.stringify(rules), ruleLogic },
    });

    const result = await getSegmentMatches(segment.id);
    const count = result?.matches.length ?? 0;
    const totalCustomers = await prisma.customer.count();

    res.json({
      ...segment,
      rules: JSON.parse(segment.rules) as SegmentRule[],
      ruleLogic: segment.ruleLogic as "AND" | "OR",
      customerCount: count,
      percentOfTotal: totalCustomers
        ? Math.round((count / totalCustomers) * 100)
        : 0,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/segments/:id/preview", async (req: Request, res: Response) => {
  try {
    const result = await getSegmentMatches(req.params.id);
    if (!result) return res.status(404).json({ error: "Segment not found" });

    res.json({
      segment: result.segment,
      matchCount: result.matches.length,
      customers: result.matches,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Campaigns ──
app.get("/api/campaigns", async (_req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        segment: true,
        communications: { include: { events: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        segmentId: c.segmentId,
        segmentName: c.segment.name,
        channel: c.channel,
        message: c.message,
        status: c.status,
        stats: buildCampaignStats(c.communications),
        createdAt: c.createdAt.toISOString(),
        sentAt: c.sentAt?.toISOString() ?? null,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/campaigns", async (req: Request, res: Response) => {
  try {
    const { name, segmentId, message, channel, tokens } = req.body;
    const campaign = await prisma.campaign.create({
      data: {
        name,
        segmentId,
        message,
        channel,
        tokens: JSON.stringify(tokens ?? {}),
        status: "draft",
      },
      include: { segment: true },
    });

    res.json({
      id: campaign.id,
      name: campaign.name,
      segmentId: campaign.segmentId,
      segmentName: campaign.segment.name,
      channel: campaign.channel,
      message: campaign.message,
      status: campaign.status,
      stats: { total: 0, sent: 0, delivered: 0, failed: 0, opened: 0, read: 0, clicked: 0, attributed: 0 },
      createdAt: campaign.createdAt.toISOString(),
      sentAt: null,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/campaigns/:id/send", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { segment: true },
    });

    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    if (campaign.status !== "draft") {
      return res.status(400).json({ error: "Only draft campaigns can be sent" });
    }

    const result = await getSegmentMatches(campaign.segmentId);
    if (!result) return res.status(404).json({ error: "Segment not found" });

    const customers = result.matches;
    if (customers.length === 0) {
      return res.status(400).json({ error: "No customers match this segment" });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: "sending", sentAt: new Date() },
    });

    res.json({
      message: `Campaign queued. Sending ${customers.length} messages.`,
      count: customers.length,
    });

    void processCampaignSend(id, campaign, customers).catch(async (err) => {
      console.error("Campaign send failed:", err);
      await prisma.campaign.update({
        where: { id },
        data: { status: "failed" },
      });
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/campaigns/:id/stats", async (req: Request, res: Response) => {
  try {
    const communications = await prisma.communication.findMany({
      where: { campaignId: req.params.id },
      include: { events: true },
    });
    res.json(buildCampaignStats(communications));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Live campaign event stream (SSE) ──
app.get("/api/campaigns/:id/events/stream", (req: Request, res: Response) => {
  const { id } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  publishCampaignEvent({
    type: "connected",
    campaignId: id,
    timestamp: new Date().toISOString(),
  });

  const unsubscribe = subscribeCampaignStream(id, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

app.get("/api/campaigns/:id/events/recent", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const events = await prisma.communicationEvent.findMany({
      where: { communication: { campaignId: req.params.id } },
      include: {
        communication: { include: { customer: { select: { id: true, name: true } } } },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    res.json(
      events.map((e) => ({
        type: "communication_event" as const,
        campaignId: req.params.id,
        communicationId: e.communicationId,
        customerId: e.communication.customerId,
        customerName: e.communication.customer.name,
        eventType: e.eventType,
        timestamp: e.timestamp.toISOString(),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Channel webhook ──
app.post("/api/webhooks/channel-callback", async (req: Request, res: Response) => {
  try {
    const { communicationId, status, event, timestamp } = req.body;

    const communication = await prisma.communication.findUnique({
      where: { id: communicationId },
      include: { customer: true },
    });

    if (!communication) {
      return res.status(404).json({ error: "Communication not found" });
    }

    const eventType = event || status;
    const eventTime = timestamp ? new Date(timestamp) : new Date();

    const existing = await prisma.communicationEvent.findUnique({
      where: {
        communicationId_eventType: {
          communicationId,
          eventType,
        },
      },
    });

    if (!existing) {
      await prisma.communicationEvent.create({
        data: { communicationId, eventType, timestamp: eventTime },
      });
    }

    publishCampaignEvent({
      type: "communication_event",
      campaignId: communication.campaignId,
      communicationId,
      customerId: communication.customerId,
      customerName: communication.customer.name,
      eventType,
      timestamp: eventTime.toISOString(),
    });

    const statusUpdates = buildCommunicationUpdates(
      communication.status,
      eventType,
      eventTime
    );

    if (statusUpdates) {
      await prisma.communication.update({
        where: { id: communicationId },
        data: statusUpdates,
      });
    }

    // Simulate order attribution on click (~4% of clicks)
    if (
      eventType === "clicked" &&
      !communication.attributedOrderId &&
      Math.random() < 0.04
    ) {
      const amount = Math.floor(Math.random() * 8000) + 500;
      const order = await prisma.order.create({
        data: {
          customerId: communication.customerId,
          amount,
          items: JSON.stringify([{ name: "Campaign Purchase", quantity: 1, price: amount }]),
          purchasedAt: new Date(),
        },
      });

      await prisma.communication.update({
        where: { id: communicationId },
        data: { attributedOrderId: order.id },
      });

      await prisma.customer.update({
        where: { id: communication.customerId },
        data: { totalSpend: { increment: amount } },
      });

      publishCampaignEvent({
        type: "communication_event",
        campaignId: communication.campaignId,
        communicationId,
        customerId: communication.customerId,
        customerName: communication.customer.name,
        eventType: "attributed",
        timestamp: new Date().toISOString(),
        attributed: true,
      });
    }

    // Mark campaign completed when all communications reach a terminal status
    const pendingCount = await prisma.communication.count({
      where: {
        campaignId: communication.campaignId,
        status: { in: ["queued", "sent"] },
      },
    });
    if (pendingCount === 0) {
      await prisma.campaign.update({
        where: { id: communication.campaignId },
        data: { status: "completed" },
      });
      publishCampaignEvent({
        type: "campaign_completed",
        campaignId: communication.campaignId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Counts (sidebar) ──
app.get("/api/counts", async (_req: Request, res: Response) => {
  try {
    const [customers, segments, campaigns] = await Promise.all([
      prisma.customer.count(),
      prisma.segment.count(),
      prisma.campaign.count(),
    ]);
    res.json({ customers, segments, campaigns });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Analytics ──
app.get("/api/analytics", async (req: Request, res: Response) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const dayKeys = buildRecentDayKeys(days);
    const since = new Date(`${dayKeys[0]}T00:00:00`);

    const events = await prisma.communicationEvent.findMany({
      where: { timestamp: { gte: since } },
      select: {
        eventType: true,
        timestamp: true,
        communication: { select: { channel: true } },
      },
    });

    const eventsByDay = aggregateEventsByDay(events, dayKeys);
    const engagementEvents = events.filter((e) =>
      ["opened", "clicked", "read"].includes(e.eventType)
    );

    const channelEvents = events.map((e) => ({
      eventType: e.eventType,
      channel: e.communication.channel,
    }));

    const funnel = aggregateFunnel(events);
    const channels = aggregateChannels(channelEvents);

    const attributedOrders = await prisma.order.count({
      where: {
        purchasedAt: { gte: since },
        attributedCommunication: { isNot: null },
      },
    });

    res.json({
      timeSeries: buildTimeSeries(dayKeys, eventsByDay),
      heatmap: buildHeatmap(engagementEvents.map((e) => e.timestamp)),
      funnel,
      channels,
      kpis: buildKpis(funnel),
      attributedOrders,
      days,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Dashboard ──
app.get("/api/dashboard", async (_req: Request, res: Response) => {
  try {
    const sparklineDays = buildRecentDayKeys(12);
    const since = new Date(`${sparklineDays[0]}T00:00:00`);

    const [
      totalCustomers,
      totalOrders,
      campaigns,
      communications,
      recentCustomers,
      recentOrders,
      recentSentCampaigns,
      recentSentEvents,
      attributedOrders,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.order.count(),
      prisma.campaign.findMany({ include: { communications: { include: { events: true } } } }),
      prisma.communication.findMany({ include: { events: true } }),
      prisma.customer.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.order.findMany({
        where: { purchasedAt: { gte: since } },
        select: { purchasedAt: true },
      }),
      prisma.campaign.findMany({
        where: { sentAt: { gte: since } },
        select: { sentAt: true },
      }),
      prisma.communicationEvent.findMany({
        where: { eventType: "sent", timestamp: { gte: since } },
        select: { timestamp: true },
      }),
      prisma.order.findMany({
        where: { attributedCommunication: { isNot: null } },
        select: { amount: true, purchasedAt: true },
      }),
    ]);

    const activeCampaigns = campaigns.filter((c) =>
      ["draft", "sending", "scheduled"].includes(c.status)
    ).length;

    const allEvents = communications.flatMap((c) => c.events);
    const countEvent = (type: string) =>
      allEvents.filter((e) => e.eventType === type).length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const messagesSentThisMonth = allEvents.filter(
      (e) => e.eventType === "sent" && e.timestamp >= monthStart
    ).length;

    const customersSparkline = countsByDay(
      recentCustomers.map((c) => c.createdAt),
      sparklineDays
    );
    const ordersSparkline = countsByDay(
      recentOrders.map((o) => o.purchasedAt),
      sparklineDays
    );
    const campaignsSparkline = countsByDay(
      recentSentCampaigns.map((c) => c.sentAt!),
      sparklineDays
    );
    const messagesSparkline = countsByDay(
      recentSentEvents.map((e) => e.timestamp),
      sparklineDays
    );
    const revenueSparkline = countsByDay(
      attributedOrders.map((o) => o.purchasedAt),
      sparklineDays
    );
    const revenueInfluenced = Math.round(
      attributedOrders.reduce((sum, o) => sum + o.amount, 0)
    );

    const funnelSent = countEvent("sent");
    const funnelDelivered = countEvent("delivered");
    const deliveryRate =
      funnelSent > 0 ? Math.round((funnelDelivered / funnelSent) * 1000) / 10 : 0;

    res.json({
      totalCustomers,
      totalOrders,
      activeCampaigns,
      messagesSentThisMonth,
      revenueInfluenced,
      deliveryRate,
      customersTrend: trendFromSeries(customersSparkline),
      ordersTrend: trendFromSeries(ordersSparkline),
      campaignsTrend: trendFromSeries(campaignsSparkline),
      messagesTrend: trendFromSeries(messagesSparkline),
      revenueTrend: trendFromSeries(revenueSparkline),
      sparklines: {
        customers: customersSparkline,
        orders: ordersSparkline,
        campaigns: campaignsSparkline,
        messages: messagesSparkline,
        revenue: revenueSparkline,
      },
      funnel: {
        sent: funnelSent,
        delivered: funnelDelivered,
        opened: countEvent("opened"),
        clicked: countEvent("clicked"),
        failed: countEvent("failed"),
      },
      cityDistribution: await prisma.customer
        .groupBy({ by: ["city"], _count: { city: true }, where: { city: { not: null } } })
        .then((rows) =>
          Object.fromEntries(rows.map((r) => [r.city!, r._count.city]))
        ),
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── AI IntelliSense (Copilot-style suggestions) ──
app.post("/api/ai/suggest", async (req: Request, res: Response) => {
  try {
    const { field, partial, context } = req.body as {
      field?: string;
      partial?: string;
      context?: { segmentName?: string; channel?: string; tone?: string };
    };

    if (field !== "campaignName" && field !== "campaignMessage") {
      return res.status(400).json({ error: "field must be campaignName or campaignMessage" });
    }

    const result = await suggestField(field, String(partial ?? ""), {
      segmentName: context?.segmentName,
      channel: context?.channel,
      tone: context?.tone as MessageTone | undefined,
    });
    res.json(result);
  } catch {
    res.json({ suggestion: "", suggestions: [], confidence: 0, reason: "" });
  }
});

app.post("/api/ai/suggest-channel", async (req: Request, res: Response) => {
  try {
    const { segmentId } = req.body as { segmentId?: string };

    if (!segmentId) {
      return res.status(400).json({ error: "segmentId is required" });
    }

    const result = await suggestChannel(prisma, segmentId);
    res.json(result);
  } catch {
    res.json({
      channel: "whatsapp",
      confidence: 0.6,
      reason: "WhatsApp is recommended for high engagement outreach",
    });
  }
});

app.post("/api/ai/suggest-segment", async (req: Request, res: Response) => {
  try {
    const { intent } = req.body as { intent?: string };
    if (!intent?.trim()) {
      return res.status(400).json({ error: "intent is required" });
    }
    const result = await suggestAudience(intent.trim());
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/campaigngpt/chat", async (req: Request, res: Response) => {
  try {
    const { userMessage, history, crmContext } = req.body as {
      userMessage?: string;
      history?: { role: string; content: string }[];
      crmContext?: string;
    };

    if (!userMessage?.trim()) {
      return res.status(400).json({ error: "userMessage is required" });
    }

    const result = await chatWithAgent(
      prisma,
      userMessage.trim(),
      history ?? [],
      crmContext
    );
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI unavailable";
    res.status(502).json({ error: message, message });
  }
});

app.post("/api/campaigngpt/execute", async (req: Request, res: Response) => {
  try {
    const { proposal } = req.body as { proposal?: unknown };

    if (!proposal || typeof proposal !== "object") {
      return res.status(400).json({ error: "proposal is required" });
    }

    const result = await executeAgentProposal(
      prisma,
      proposal as Parameters<typeof executeAgentProposal>[1],
      processCampaignSend,
      async (segmentId) => {
        const matchResult = await getSegmentMatches(segmentId);
        if (!matchResult) return null;
        return {
          matches: matchResult.matches.map((c) => ({
            id: c.id,
            name: c.name,
            city: c.city,
          })),
        };
      }
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    res.status(500).json({ error: message, message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CRM Backend running on http://localhost:${PORT}`);
});
