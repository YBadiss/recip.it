import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

/**
 * Middleware to log all API requests and responses
 */
export class LoggingMiddleware {
  private logger: Logger;

  constructor() {
    this.logger = Logger.forContext('HttpMiddleware');
  }

  /**
   * Log request and response details
   */
  logRequest = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    const logger = this.logger;

    // Log request details
    const requestLog = {
      id: requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      user: req.user?.userId || 'anonymous',
    };

    logger.info(`Request ${requestId}`, requestLog);

    // Capture and log response
    const originalSend = res.send;

    res.send = function (body): Response {
      const responseTime = Date.now() - startTime;

      // Log response details
      const responseLog = {
        id: requestId,
        timestamp: new Date().toISOString(),
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        headers: res.getHeaders(),
        // Log response body selectively - avoid large payloads
        body:
          typeof body === 'string' && body.length < 1000
            ? body
            : '[Response body too large to log]',
      };

      logger.info(`Response ${requestId}`, responseLog);

      // Call the original send function
      return originalSend.call(this, body);
    };

    next();
  };
}
