import { Request, Response } from 'express';
import crypto from 'crypto';
import { Logger } from '../../utils/logger';
import { Config } from '../../config';
import { MetaService } from '../../services/meta/meta-service';
import { MetaWebhookPayload } from '../../services/meta/models';

// Extend the Express Request interface to include rawBody
interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

export class MetaWebhookController {
  private logger: Logger;
  private metaService: MetaService;

  constructor(metaService: MetaService) {
    this.logger = new Logger('MetaWebhookController');
    this.metaService = metaService;
  }

  /**
   * Handle Meta webhook verification
   * Meta sends a GET request with a challenge parameter to verify the webhook
   */
  public verifyWebhook = (req: Request, res: Response) => {
    // Extract query parameters
    this.logger.info('Received Meta webhook verification request', { query: req.query });
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify token (should be a secret token set in your Meta app)
    // For now, we'll just use a simple verification
    const verifyToken = Config.META_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.info('Meta webhook verified successfully');
      // Return the challenge code to verify the webhook
      res.status(200).send(challenge);
    } else {
      this.logger.error('Meta webhook verification failed', { mode, token });
      res.sendStatus(403);
    }
  };

  /**
   * Handle Meta webhook POST requests
   * Meta sends data to this endpoint when events occur
   */
  public handleWebhook = async (req: Request, res: Response) => {
    try {
      // Verify the webhook payload signature
      const isValid = this.verifySignature(req);
      if (!isValid) {
        if (Config.IS_PRODUCTION) {
          this.logger.error('Invalid webhook signature');
          return res.status(401).json({ status: 'error', message: 'Invalid signature' });
        } else {
          this.logger.error('Invalid webhook signature, but we are in dev mode');
        }
      }

      // Log the incoming webhook payload
      this.logger.info('Received Meta webhook', { body: JSON.stringify(req.body) });

      // Process the webhook data
      const payload = req.body as MetaWebhookPayload;

      // Always respond with a 200 OK first to acknowledge receipt
      // Meta expects a quick response to the webhook
      res.status(200).json({ status: 'success' });

      // Process messages asynchronously after responding to the webhook
      await this.metaService.processWebhook(payload);
    } catch (error) {
      this.logger.error('Error processing Instagram webhook', { error });
      // Still return 200 to Instagram to prevent retries if we haven't responded yet
      if (!res.headersSent) {
        res.status(200).json({ status: 'error', message: 'Error processing webhook' });
      }
    }
  };

  /**
   * Verify the webhook signature to ensure it's from Meta (Facebook/Instagram)
   * @param req Request object containing payload and headers
   * @returns boolean indicating if signature is valid
   */
  private verifySignature(req: Request): boolean {
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
}
