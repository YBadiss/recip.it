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
    text?: string;
    attachments?: MetaAttachment[];
  };
}

interface IGReelAttachement {
  type: 'ig_reel';
  payload: {
    reel_video_id: string;
    title: string;
    url: string;
  };
}

type MetaAttachment = IGReelAttachement;

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

export interface MetaPost {
  link: string;
  textContent?: string;
  imageContent?: string;
  reelUrl: string;
  userContext?: string;
  systemContext?: string;
}
