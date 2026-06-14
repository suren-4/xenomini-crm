import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { getDeadLetterCount, getDeadLetterLog } from "./callback";
import { simulateCommunication } from "./delivery";
import { ConcurrencyQueue } from "./queue";
import type { SendRequest } from "./types";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const CONCURRENCY = Number(process.env.CHANNEL_CONCURRENCY) || 12;
const deliveryQueue = new ConcurrencyQueue(CONCURRENCY);

function validateSendBody(body: unknown): SendRequest | null {
  if (!body || typeof body !== "object") return null;
  const { campaignId, communications, crmCallbackUrl } = body as SendRequest;
  if (!campaignId || !crmCallbackUrl || !Array.isArray(communications)) return null;
  if (communications.length === 0) return null;
  for (const c of communications) {
    if (!c?.id || !c?.customerId || !c?.channel || typeof c.message !== "string") {
      return null;
    }
  }
  return { campaignId, communications, crmCallbackUrl };
}

app.post("/api/send", async (req: Request, res: Response) => {
  try {
    const payload = validateSendBody(req.body);
    if (!payload) {
      return res.status(400).json({ error: "Invalid send payload" });
    }

    const { campaignId, communications, crmCallbackUrl } = payload;

    console.log(
      `[send] campaign=${campaignId} messages=${communications.length} callback=${crmCallbackUrl}`
    );

    res.json({
      ok: true,
      message: `Queued ${communications.length} messages`,
      campaignId,
      concurrency: CONCURRENCY,
    });

    for (const comm of communications) {
      deliveryQueue.enqueue(() =>
        simulateCommunication(comm, crmCallbackUrl, campaignId)
      );
    }
  } catch (error) {
    console.error("Error in /api/send:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/health", (_req, res) => {
  const queue = deliveryQueue.getStats();
  res.json({
    ok: true,
    service: "channel-service",
    queue: {
      ...queue,
      deadLetterCount: getDeadLetterCount(),
    },
  });
});

/** Debug endpoint — dead-letter callbacks after retry exhaustion */
app.get("/api/dead-letter", (_req, res) => {
  res.json({ count: getDeadLetterCount(), entries: getDeadLetterLog() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Channel Service running on http://localhost:${PORT}`);
  console.log(`Concurrency: ${CONCURRENCY} | Callback retries: ${process.env.CALLBACK_MAX_RETRIES || 4}`);
});
