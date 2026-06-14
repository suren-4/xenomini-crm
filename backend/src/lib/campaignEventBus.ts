import type { Response } from "express";

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

type Subscriber = Response;

const subscribers = new Map<string, Set<Subscriber>>();

function getSet(campaignId: string): Set<Subscriber> {
  let set = subscribers.get(campaignId);
  if (!set) {
    set = new Set();
    subscribers.set(campaignId, set);
  }
  return set;
}

export function subscribeCampaignStream(campaignId: string, res: Response): () => void {
  const set = getSet(campaignId);
  set.add(res);

  return () => {
    set.delete(res);
    if (set.size === 0) subscribers.delete(campaignId);
  };
}

export function publishCampaignEvent(event: CampaignStreamEvent): void {
  const set = subscribers.get(event.campaignId);
  if (!set?.size) return;

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      set.delete(res);
    }
  }
}

export function streamSubscriberCount(campaignId: string): number {
  return subscribers.get(campaignId)?.size ?? 0;
}
