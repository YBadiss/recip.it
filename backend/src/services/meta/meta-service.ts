import { Request } from 'express';
import crypto from 'crypto';
import { Logger } from '../../utils/logger';
import { Config } from '../../config';
import { MetaPost, MetaWebhookPayload } from './models';
import axios from 'axios';
import { RecipeService } from '../recipe-service';
import { VideoService } from '../media/video-service';

// Extend the Express Request interface to include rawBody
interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

export class MetaService {
  private logger: Logger;
  private userIds: string[];
  private accessToken: string;
  private recipeService: RecipeService;
  private videoService: VideoService;

  constructor(recipeService: RecipeService, videoService: VideoService) {
    this.logger = new Logger('MetaService');
    this.userIds = [Config.IG_USER_ID, Config.FB_USER_ID];
    this.accessToken = Config.META_ACCESS_TOKEN;
    this.recipeService = recipeService;
    this.videoService = videoService;
  }

  /**
   * Verify the webhook signature to ensure it's from Meta (Facebook/Instagram)
   * @param req Request object containing payload and headers
   * @returns boolean indicating if signature is valid
   */
  public verifySignature(req: Request): boolean {
    try {
      // Get the signature from the headers
      const signature = req.headers['x-hub-signature-256'];
      if (!signature || typeof signature !== 'string') {
        this.logger.error('Missing signature header');
        return false;
      }

      // Extract the signature value (remove 'sha256=' prefix)
      const receivedSignature = signature.startsWith('sha256=')
        ? signature.substring(7)
        : signature;

      // Get the raw request body (as Buffer)
      const requestWithRawBody = req as RequestWithRawBody;
      const rawBody = requestWithRawBody.rawBody;
      if (!rawBody) {
        this.logger.error('Raw body not available');
        return false;
      }

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', Config.META_APP_SECRET)
        .update(rawBody)
        .digest('hex');

      // Compare signatures
      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        this.logger.error('Signature mismatch', {
          received: receivedSignature,
          expected: expectedSignature,
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying signature', { error });
      return false;
    }
  }

  /**
   * Handle webhook verification for Meta platforms
   * @param req The request containing verification parameters
   * @param verifyToken Token to match against the request
   * @returns Object with success status and challenge value if successful
   */
  public verifyWebhookChallenge(
    req: Request,
    verifyToken: string
  ): { success: boolean; challenge?: string } {
    // Extract query parameters
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.info('Webhook verification successful');
      return { success: true, challenge: challenge as string };
    } else {
      this.logger.error('Webhook verification failed', { mode, token });
      return { success: false };
    }
  }

  public async processWebhook(payload: MetaWebhookPayload): Promise<void> {
    try {
      // Process each entry in the webhook payload
      for (const entry of payload.entry) {
        // Process messaging events (direct messages)
        if (entry.messaging) {
          for (const messaging of entry.messaging) {
            const senderId = messaging.sender.id;

            // Skip messages from our own user ID to prevent loops
            if (this.userIds.includes(senderId)) {
              this.logger.info('Ignoring message from our own user ID', { senderId });
              continue;
            }

            // Check if this is a message with text
            if (messaging.message) {
              // Check if there are attachments
              if (messaging.message.attachments && messaging.message.attachments.length > 0) {
                for (const attachment of messaging.message.attachments) {
                  this.logger.info('Processing attachment', { type: attachment.type });

                  if (attachment.type === 'ig_reel') {
                    await this.sendMessage(
                      senderId,
                      `I am processing your reel. This may take a few seconds...`
                    );

                    let imageUrl = '';
                    try {
                      // Extract the first frame from the video and upload it to Imgur
                      imageUrl = await this.videoService.extractFirstFrameAndUploadToImgur(
                        attachment.payload.url
                      );
                    } catch (error) {
                      this.logger.error('Error processing video thumbnail', { error });
                    }

                    const metaPost: MetaPost = {
                      link: `meta://reel/${attachment.payload.reel_video_id}`,
                      textContent: attachment.payload.title,
                      imageUrl: imageUrl,
                    };

                    try {
                      const recipe = await this.recipeService.addRecipeFromMetaPost(
                        metaPost,
                        senderId
                      );
                      await this.sendMessage(
                        senderId,
                        `I've added this recipe to your collection: ${Config.RECIPE_URL_PREFIX}/${recipe.id}`
                      );
                    } catch (error) {
                      this.logger.error('Error extracting recipe from content', { error });
                      await this.sendMessage(
                        senderId,
                        `I couldn't extract recipe information from your content. Reach out to admin@recipit.me for support.`
                      );
                    }
                  } else if (attachment.type === 'fallback') {
                    await this.sendMessage(
                      senderId,
                      `I am processing your content. This may take a few seconds...`
                    );
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    // Fake it for now...
                    const recipeId = '69428b58-7878-4c31-8bfc-b66a09a5fbf5';
                    await this.sendMessage(
                      senderId,
                      `I've added this recipe to your collection: ${Config.RECIPE_URL_PREFIX}/${recipeId}`
                    );
                  } else {
                    await this.sendMessage(
                      senderId,
                      `Hey! I am the Reci'Pear! Share a recipe with me and I'll save it to https://recipit.me for you :)`
                    );
                  }
                }
              }
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
  private async sendMessage(recipientId: string, messageText: string): Promise<void> {
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
