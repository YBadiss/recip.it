import express from 'express';
import { WebhookController } from '../controllers/webhook-controller';

export function createWebhookRouter(webhookController: WebhookController) {
  const router = express.Router();

  /**
   * Instagram webhook endpoint
   * This endpoint handles incoming webhooks from Instagram API
   */
  router.post('/ig', webhookController.handleInstagramWebhook);

  /**
   * Instagram webhook verification endpoint
   * This endpoint is used by Instagram to verify the webhook
   */
  router.get('/ig', webhookController.verifyInstagramWebhook);

  return router;
}
