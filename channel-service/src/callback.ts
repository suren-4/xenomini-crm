import type { DeadLetterEntry } from "./types";

const MAX_RETRIES = Number(process.env.CALLBACK_MAX_RETRIES) || 4;
const BASE_DELAY_MS = Number(process.env.CALLBACK_BASE_DELAY_MS) || 400;

const deadLetterLog: DeadLetterEntry[] = [];
const MAX_DEAD_LETTER = 200;

function recordDeadLetter(entry: DeadLetterEntry) {
  deadLetterLog.push(entry);
  if (deadLetterLog.length > MAX_DEAD_LETTER) {
    deadLetterLog.shift();
  }
  console.error(
    `[dead-letter] ${entry.communicationId} event=${entry.event} after ${entry.attempts} attempts: ${entry.lastError}`
  );
}

export function getDeadLetterLog(): DeadLetterEntry[] {
  return [...deadLetterLog];
}

export function getDeadLetterCount(): number {
  return deadLetterLog.length;
}

/**
 * POST callback to CRM with exponential backoff retries.
 * CRM webhook dedupes by (communicationId, eventType) so retries are safe.
 */
export async function sendCallbackWithRetry(
  crmCallbackUrl: string,
  communicationId: string,
  event: string,
  campaignId?: string
): Promise<void> {
  let lastError = "unknown";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(crmCallbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Channel-Service": "xeno-channel-service",
          "X-Callback-Attempt": String(attempt),
        },
        body: JSON.stringify({
          communicationId,
          status: event,
          event,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        if (attempt > 1) {
          console.log(
            `[callback] ${communicationId} ${event} succeeded on attempt ${attempt}`
          );
        }
        return;
      }

      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (attempt < MAX_RETRIES) {
      const delay = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  recordDeadLetter({
    communicationId,
    event,
    campaignId,
    attempts: MAX_RETRIES,
    lastError,
    at: new Date().toISOString(),
  });
}
