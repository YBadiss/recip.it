import { Request, Response } from 'express';
import { Logger } from '../../utils/logger';
import { Config } from '../../config';
import { MetaService } from '../../services/meta/meta-service';
import { MetaWebhookPayload } from '../../services/meta/models';

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
      const isValid = this.metaService.verifySignature(req);
      if (!isValid) {
        this.logger.error('Invalid webhook signature');
        return res.status(401).json({ status: 'error', message: 'Invalid signature' });
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
}
