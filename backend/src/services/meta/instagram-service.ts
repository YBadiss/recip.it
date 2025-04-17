import axios from 'axios';
import { Logger } from '../../utils/logger';
import { Config } from '../../config';
import { MetaWebhookPayload } from './models';

export class InstagramService {
  private logger: Logger;
  private userId: string;
  private accessToken: string;

  constructor() {
    this.logger = new Logger('InstagramService');
    this.userId = Config.META_USER_ID;
    this.accessToken = Config.META_ACCESS_TOKEN;
  }

  /**
   * Process webhook data from Instagram
   * @param payload The webhook payload to process
   */
  public async processWebhook(payload: MetaWebhookPayload): Promise<void> {
    try {
      // Process each entry in the webhook payload
      for (const entry of payload.entry) {
        // Process messaging events (direct messages)
        if (entry.messaging) {
          for (const messaging of entry.messaging) {
            // Check if this is a message with text
            if (messaging.message && messaging.message.text) {
              const senderId = messaging.sender.id;
              const messageText = messaging.message.text;

              // Skip messages from our own user ID to prevent loops
              if (senderId === this.userId) {
                this.logger.info('Ignoring message from our own user ID', { senderId });
                continue;
              }

              // Respond to the user with their message
              await this.sendMessage(senderId, `You've said: ${messageText}`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error processing Instagram webhook messages', { error });
    }
  }

  /**
   * Send a message to a user on Instagram
   * @param recipientId ID of the recipient
   * @param messageText Text content of the message
   */
  public async sendMessage(recipientId: string, messageText: string): Promise<void> {
    try {
      // Instagram messaging API URL
      const url = `https://graph.facebook.com/v19.0/me/messages`;

      // Message payload
      const payload = {
        recipient: { id: recipientId },
        message: { text: messageText },
        messaging_type: 'RESPONSE',
      };

      // Send message
      const response = await axios.post(url, payload, {
        params: {
          access_token: this.accessToken,
        },
      });

      this.logger.info('Sent message to Instagram user', {
        recipientId,
        messageText,
        responseData: response.data,
      });
    } catch (error) {
      this.logger.error('Failed to send Instagram message', {
        recipientId,
        messageText,
        error,
      });
    }
  }
}
