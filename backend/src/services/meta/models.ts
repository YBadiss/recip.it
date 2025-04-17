// Meta webhook payload types
interface MetaWebhookEntry {
  id: string;
  time: number;
  messaging?: MetaMessaging[];
}

interface MetaMessaging {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text: string;
  };
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}
