/** Communication status rank — only move forward, never downgrade on duplicate/late callbacks */
const STATUS_RANK: Record<string, number> = {
  queued: 0,
  sent: 1,
  failed: 10,
  delivered: 2,
  opened: 3,
  read: 4,
  clicked: 5,
};

const TERMINAL_STATUSES = new Set(["failed", "clicked"]);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function shouldAdvanceStatus(current: string, incoming: string): boolean {
  if (incoming === "failed") {
    return current === "queued" || current === "sent";
  }
  const currentRank = STATUS_RANK[current] ?? 0;
  const incomingRank = STATUS_RANK[incoming] ?? 0;
  if (current === "failed") return false;
  return incomingRank > currentRank;
}

export function timestampFieldForEvent(
  eventType: string
): "sentAt" | "deliveredAt" | "openedAt" | "readAt" | "clickedAt" | null {
  switch (eventType) {
    case "sent":
      return "sentAt";
    case "delivered":
      return "deliveredAt";
    case "opened":
      return "openedAt";
    case "read":
      return "readAt";
    case "clicked":
      return "clickedAt";
    default:
      return null;
  }
}

export function buildCommunicationUpdates(
  currentStatus: string,
  eventType: string,
  eventTime: Date
): Record<string, unknown> | null {
  if (!shouldAdvanceStatus(currentStatus, eventType)) {
    return null;
  }

  const updates: Record<string, unknown> = { status: eventType };
  const tsField = timestampFieldForEvent(eventType);
  if (tsField) updates[tsField] = eventTime;
  return updates;
}
