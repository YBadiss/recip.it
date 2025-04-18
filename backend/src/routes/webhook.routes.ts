import express from 'express';
import { MetaWebhookController } from '../controllers/webhooks/meta-webhook-controller';

export function createWebhookRouter(metaWebhookController: MetaWebhookController) {
  const router = express.Router();

  /**
   * Instagram webhook endpoint
   * This endpoint handles incoming webhooks from Instagram API
   */
  router.post('/meta', metaWebhookController.handleWebhook);

  /**
   * Instagram webhook verification endpoint
   * This endpoint is used by Instagram to verify the webhook
   */
  router.get('/meta', metaWebhookController.verifyWebhook);

  return router;
}
