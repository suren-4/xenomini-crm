const DELIVERY_RATES: Record<string, number> = {
  whatsapp: 0.92,
  sms: 0.88,
  email: 0.78,
  rcs: 0.85,
};

const ENGAGEMENT_RATES: Record<string, { open: number; read: number; click: number }> = {
  whatsapp: { open: 0.65, read: 0.45, click: 0.18 },
  sms: { open: 0.45, read: 0.3, click: 0.12 },
  email: { open: 0.35, read: 0.25, click: 0.1 },
  rcs: { open: 0.7, read: 0.5, click: 0.22 },
};

/** Ordered lifecycle per message — matches real channel event sequencing */
export function generateEventSequence(channel: string): string[] {
  const deliveryRate = DELIVERY_RATES[channel] ?? 0.85;
  const rates = ENGAGEMENT_RATES[channel] ?? { open: 0.5, read: 0.3, click: 0.15 };

  const events: string[] = ["sent"];

  if (Math.random() > deliveryRate) {
    events.push("failed");
    return events;
  }

  events.push("delivered");

  if (Math.random() < rates.open) {
    events.push("opened");
    if (Math.random() < rates.read) events.push("read");
    if (Math.random() < rates.click) events.push("clicked");
  }

  return events;
}

export function jitterMs(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
