import { Request, Response } from 'express';
import { Logger } from '../utils/logger';
import { Config } from '../config';
import crypto from 'crypto';

// Extend the Express Request interface to include rawBody
interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

export class WebhookController {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('WebhookController');
  }

  /**
   * Handle Instagram webhook verification
   * Instagram sends a GET request with a challenge parameter to verify the webhook
   */
  public verifyInstagramWebhook = (req: Request, res: Response) => {
    // Extract query parameters
    this.logger.info('Received Instagram webhook verification request', { query: req.query });
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify token (should be a secret token set in your Instagram app)
    // For now, we'll just use a simple verification
    const verifyToken = Config.INSTAGRAM_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.info('Instagram webhook verified successfully');
      // Return the challenge code to verify the webhook
      res.status(200).send(challenge);
    } else {
      this.logger.error('Instagram webhook verification failed', { mode, token });
      res.sendStatus(403);
    }
  };

  /**
   * Handle Instagram webhook POST requests
   * Instagram sends data to this endpoint when events occur
   */
  public handleInstagramWebhook = (req: Request, res: Response) => {
    try {
      // Verify the webhook payload signature
      const isValid = this.verifySignature(req);
      if (!isValid) {
        this.logger.error('Invalid webhook signature');
        return res.status(401).json({ status: 'error', message: 'Invalid signature' });
      }

      // Log the incoming webhook payload
      this.logger.info('Received Instagram webhook', { body: JSON.stringify(req.body) });

      // Process the webhook data
      // Here you would typically process the webhook data based on event type
      // For now, we're just logging it

      // Always respond with a 200 OK to acknowledge receipt
      res.status(200).json({ status: 'success' });
    } catch (error) {
      this.logger.error('Error processing Instagram webhook', { error });
      // Still return 200 to Instagram to prevent retries
      res.status(200).json({ status: 'error', message: 'Error processing webhook' });
    }
  };

  /**
   * Verify the webhook signature to ensure it's from Instagram
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

      // Generate the signature using the app secret
      const appSecret = Config.INSTAGRAM_APP_SECRET;
      if (!appSecret) {
        this.logger.error('App secret not configured');
        return false;
      }

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
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
