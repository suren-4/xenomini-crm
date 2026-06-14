export interface Communication {
  id: string;
  customerId: string;
  channel: string;
  message: string;
}

export interface SendRequest {
  campaignId: string;
  communications: Communication[];
  crmCallbackUrl: string;
}

export interface DeadLetterEntry {
  communicationId: string;
  event: string;
  campaignId?: string;
  attempts: number;
  lastError: string;
  at: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  concurrency: number;
  deadLetterCount: number;
}
