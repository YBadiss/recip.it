import { Request } from 'express';
import crypto from 'crypto';
import { Logger } from '../../utils/logger';
import { Config } from '../../config';
import { MetaWebhookPayload } from './models';
import { InstagramService } from './instagram-service';

// Extend the Express Request interface to include rawBody
interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

export class MetaService {
  private logger: Logger;
  private igService: InstagramService;

  constructor(igService: InstagramService) {
    this.logger = new Logger('MetaService');
    this.igService = igService;
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

  public processWebhook(payload: MetaWebhookPayload): void {
    this.logger.info('Processing Meta webhook', { payload });
    if (payload.object === 'instagram') {
      this.logger.info('Instagram webhook received', { payload });
      this.igService.processWebhook(payload);
    } else {
      this.logger.warn('Unknown meta webhook', { payload });
    }
  }
}
