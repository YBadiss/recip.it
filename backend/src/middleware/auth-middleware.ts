import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { Config } from '../config';

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

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  // Middleware to verify JWT token from headers or cookies
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    let token: string | undefined;

    // Check authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check cookie if token not found in header
    if (!token && req.cookies) {
      token = req.cookies[Config.COOKIE_NAME];
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = this.authService.verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Attach user info to request
    req.user = decoded;
    next();
  };

  // Middleware to check if user has permission to access the endpoint
  authorize = (endpoint: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess =
        req.user.authorizedEndpoints.includes(endpoint) ||
        req.user.authorizedEndpoints.includes('*');
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      next();
    };
  };
}
