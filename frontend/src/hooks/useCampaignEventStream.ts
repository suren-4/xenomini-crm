import { useCallback, useEffect, useState } from "react";
import type { CampaignStreamEvent } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function useCampaignEventStream(
  campaignId: string | null,
  enabled: boolean
) {
  const [events, setEvents] = useState<CampaignStreamEvent[]>([]);
  const [connected, setConnected] = useState(false);

  const prependEvent = useCallback((event: CampaignStreamEvent) => {
    if (event.type === "connected") {
      setConnected(true);
      return;
    }
    setEvents((prev) => {
      const key = `${event.communicationId}-${event.eventType}-${event.timestamp}`;
      if (prev.some((e) => `${e.communicationId}-${e.eventType}-${e.timestamp}` === key)) {
        return prev;
      }
      return [event, ...prev].slice(0, 80);
    });
  }, []);

  useEffect(() => {
    if (!campaignId) {
      setEvents([]);
      setConnected(false);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/api/campaigns/${campaignId}/events/recent?limit=40`)
      .then((r) => r.json())
      .then((recent: CampaignStreamEvent[]) => {
        if (!cancelled) setEvents(recent);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || !enabled) {
      setConnected(false);
      return;
    }

    const url = `${API_BASE}/api/campaigns/${campaignId}/events/stream`;
    const source = new EventSource(url);

    source.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as CampaignStreamEvent;
        prependEvent(data);
      } catch {
        /* ignore malformed */
      }
    };

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [campaignId, enabled, prependEvent]);

  return { events, connected, live: enabled && connected };
}
