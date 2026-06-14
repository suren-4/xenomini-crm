import { sendCallbackWithRetry } from "./callback";
import { generateEventSequence, jitterMs, sleep } from "./simulator";
import type { Communication } from "./types";

/**
 * Simulate one message lifecycle: events fire strictly in order (await chain).
 * Delays between events mimic async provider webhooks.
 */
export async function simulateCommunication(
  comm: Communication,
  crmCallbackUrl: string,
  campaignId: string
): Promise<void> {
  const events = generateEventSequence(comm.channel);

  for (let i = 0; i < events.length; i++) {
    if (i > 0) {
      await sleep(jitterMs(80, 280));
    } else {
      await sleep(jitterMs(50, 200));
    }
    await sendCallbackWithRetry(crmCallbackUrl, comm.id, events[i], campaignId);
  }
}
