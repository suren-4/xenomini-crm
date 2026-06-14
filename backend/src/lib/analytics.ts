const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

export function dayKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function buildRecentDayKeys(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

export function countsByDay(dates: Date[], dayKeys: string[]): number[] {
  const map = new Map(dayKeys.map((k) => [k, 0]));
  for (const date of dates) {
    const key = dayKey(date);
    if (map.has(key)) map.set(key, map.get(key)! + 1);
  }
  return dayKeys.map((k) => map.get(k) ?? 0);
}

export function percentTrend(recent: number, previous: number): number {
  if (previous === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - previous) / previous) * 1000) / 10;
}

export function sumSlice(values: number[], start: number, end: number): number {
  return values.slice(start, end).reduce((acc, v) => acc + v, 0);
}

export function trendFromSeries(series: number[]): number {
  if (series.length < 2) return 0;
  const half = Math.floor(series.length / 2);
  const previous = sumSlice(series, 0, half);
  const recent = sumSlice(series, half, series.length);
  return percentTrend(recent, previous);
}

export function formatChartLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function buildTimeSeries(
  dayKeys: string[],
  eventsByDay: Map<string, { sent: number; delivered: number; opened: number; clicked: number }>
) {
  return dayKeys.map((date) => {
    const bucket = eventsByDay.get(date) ?? { sent: 0, delivered: 0, opened: 0, clicked: 0 };
    return {
      date,
      label: formatChartLabel(date),
      sent: bucket.sent,
      delivered: bucket.delivered,
      opened: bucket.opened,
      clicked: bucket.clicked,
    };
  });
}

export function buildHeatmap(eventDates: Date[]) {
  const grid = new Map<string, number>();
  for (const day of HEATMAP_DAYS) {
    for (const hour of HEATMAP_HOURS) {
      grid.set(`${day}-${hour}`, 0);
    }
  }

  for (const date of eventDates) {
    const day = DAY_LABELS[date.getDay()];
    const hour = `${String(date.getHours()).padStart(2, "0")}:00`;
    const key = `${day}-${hour}`;
    if (grid.has(key)) grid.set(key, grid.get(key)! + 1);
  }

  const data = HEATMAP_DAYS.flatMap((day) =>
    HEATMAP_HOURS.map((hour) => ({
      day,
      hour,
      value: grid.get(`${day}-${hour}`) ?? 0,
    }))
  );

  return { days: HEATMAP_DAYS, hours: HEATMAP_HOURS, data };
}

export function aggregateEventsByDay(
  events: { eventType: string; timestamp: Date }[],
  dayKeys: string[]
) {
  const map = new Map(
    dayKeys.map((k) => [k, { sent: 0, delivered: 0, opened: 0, clicked: 0 }])
  );

  for (const event of events) {
    const key = dayKey(event.timestamp);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (event.eventType === "sent") bucket.sent++;
    if (event.eventType === "delivered") bucket.delivered++;
    if (event.eventType === "opened" || event.eventType === "read") bucket.opened++;
    if (event.eventType === "clicked") bucket.clicked++;
  }

  return map;
}

export const ANALYTICS_CHANNELS = ["whatsapp", "sms", "email", "rcs"] as const;
export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

export interface FunnelStats {
  sent: number;
  delivered: number;
  opened: number;
  read: number;
  clicked: number;
  failed: number;
}

export function emptyFunnel(): FunnelStats {
  return { sent: 0, delivered: 0, opened: 0, read: 0, clicked: 0, failed: 0 };
}

export function aggregateFunnel(events: { eventType: string }[]): FunnelStats {
  const funnel = emptyFunnel();
  for (const event of events) {
    if (event.eventType === "sent") funnel.sent++;
    else if (event.eventType === "delivered") funnel.delivered++;
    else if (event.eventType === "opened") funnel.opened++;
    else if (event.eventType === "read") funnel.read++;
    else if (event.eventType === "clicked") funnel.clicked++;
    else if (event.eventType === "failed") funnel.failed++;
  }
  return funnel;
}

export function aggregateChannels(
  events: { eventType: string; channel: string }[]
): Record<AnalyticsChannel, FunnelStats> {
  const channels = Object.fromEntries(
    ANALYTICS_CHANNELS.map((ch) => [ch, emptyFunnel()])
  ) as Record<AnalyticsChannel, FunnelStats>;

  for (const event of events) {
    const ch = event.channel as AnalyticsChannel;
    if (!channels[ch]) continue;
    if (event.eventType === "sent") channels[ch].sent++;
    else if (event.eventType === "delivered") channels[ch].delivered++;
    else if (event.eventType === "opened") channels[ch].opened++;
    else if (event.eventType === "read") channels[ch].read++;
    else if (event.eventType === "clicked") channels[ch].clicked++;
    else if (event.eventType === "failed") channels[ch].failed++;
  }

  return channels;
}

export function buildKpis(funnel: FunnelStats) {
  const safeSent = funnel.sent || 1;
  return {
    totalSent: funnel.sent,
    deliveryRate: Math.round((funnel.delivered / safeSent) * 1000) / 10,
    openRate: funnel.delivered
      ? Math.round((funnel.opened / funnel.delivered) * 1000) / 10
      : 0,
    clickRate: funnel.opened
      ? Math.round((funnel.clicked / funnel.opened) * 1000) / 10
      : 0,
    failureRate: Math.round((funnel.failed / safeSent) * 1000) / 10,
    failed: funnel.failed,
  };
}
