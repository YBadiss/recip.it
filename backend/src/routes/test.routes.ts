import express from 'express';
import { authenticator } from 'otplib';
import { Config } from '../config';

export const createTestRouter = (): express.Router => {
  const router = express.Router();

  // Fixed TOTP secret for this test endpoint
  const TOTP_SECRET = Config.TOTP_SECRET; // This is a sample secret, don't use in production

  // Route to get current TOTP
  router.get('/1b5e28c3-658a-4c6c-b855-4c1a88a487a1', (req, res) => {
    try {
      // Generate the current TOTP using the secret
      const totp = authenticator.generate(TOTP_SECRET);

      // Return the TOTP
      res.json({
        totp,
        timeRemaining: authenticator.timeRemaining(),
        timeUsed: authenticator.timeUsed(),
      });
    } catch (error) {
      console.error('Error generating TOTP:', error);
      res.status(500).json({ error: 'Failed to generate TOTP' });
    }
  });

  return router;
};
