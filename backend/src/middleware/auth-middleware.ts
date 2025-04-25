import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { Config } from '../config';
import { Logger } from '../utils/logger';

// Extend Express Request interface to include user information
// Using module augmentation instead of namespace declaration
import 'express';
declare module 'express' {
  interface Request {
    user?: {
      userId: string;
      username: string;
      authorizedEndpoints: string[];
    };
  }
}

export class AuthMiddleware {
  private authService: AuthService;
  private logger: Logger;

  constructor(authService: AuthService) {
    this.authService = authService;
    this.logger = Logger.forContext('AuthMiddleware');
  }

  // Middleware to verify JWT token from headers or cookies
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    this.logger.info('Authenticating request', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    const user = this.getUser(req);

    if (!user) {
      this.logger.info('Authentication failed - no valid user token', {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Attach user info to request
    req.user = user;
    this.logger.info('User authenticated successfully', {
      userId: user.userId,
      username: user.username,
    });
    next();
  };

  tryAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
    this.logger.info('Attempting optional authentication', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    const user = this.getUser(req);

    if (user) {
      // Attach user info to request
      req.user = user;
      this.logger.info('Optional authentication successful', {
        userId: user.userId,
        username: user.username,
      });
    } else {
      this.logger.info('No authentication provided, continuing as anonymous');
    }
    next();
  };

  private getUser = (
    req: Request
  ): { userId: string; username: string; authorizedEndpoints: string[] } | null => {
    let token: string | undefined;

    // Check authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      this.logger.info('Found token in Authorization header');
    }

    // Check cookie if token not found in header
    if (!token && req.cookies) {
      token = req.cookies[Config.COOKIE_NAME];
      if (token) {
        this.logger.info('Found token in cookies');
      }
    }

    if (!token) {
      this.logger.info('No authentication token found');
      return null;
    }

    this.logger.info('Verifying authentication token');
    const decoded = this.authService.verifyToken(token);
    if (!decoded) {
      this.logger.info('Token verification failed');
      return null;
    }

    this.logger.info('Token verified successfully', { userId: decoded.userId });
    // Return user info
    return decoded;
  };

  // Middleware to check if user has permission to access the endpoint
  authorize = (endpoint: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      this.logger.info('Authorizing access to endpoint', {
        endpoint,
        userId: req.user?.userId,
      });

      if (!req.user) {
        this.logger.info('Authorization failed - user not authenticated');
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess =
        req.user.authorizedEndpoints.includes(endpoint) ||
        req.user.authorizedEndpoints.includes('*');

      if (!hasAccess) {
        this.logger.info('Authorization denied', {
          userId: req.user.userId,
          endpoint,
          authorizedEndpoints: req.user.authorizedEndpoints,
        });
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      this.logger.info('Authorization successful', {
        userId: req.user.userId,
        endpoint,
      });
      next();
    };
  };
}
