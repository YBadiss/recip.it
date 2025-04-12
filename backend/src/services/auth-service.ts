import jwt, { SignOptions } from 'jsonwebtoken';
import { Config } from '../config';
import { User, UserWithoutPassword } from '../models/user';

export class AuthService {
  // Generate a JWT token for a user
  generateToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      authorizedEndpoints: user.authorizedEndpoints,
    };

    const options: SignOptions = {
      expiresIn: Config.JWT_EXPIRATION as jwt.SignOptions['expiresIn'],
    };

    // Cast the JWT_SECRET to Secret type to resolve type errors
    return jwt.sign(payload, Config.JWT_SECRET, options);
  }

  // Verify and decode a JWT token
  verifyToken(
    token: string
  ): { userId: string; username: string; authorizedEndpoints: string[] } | null {
    try {
      const decoded = jwt.verify(token, Config.JWT_SECRET) as {
        sub: string;
        username: string;
        authorizedEndpoints: string[];
      };

      return {
        userId: decoded.sub,
        username: decoded.username,
        authorizedEndpoints: decoded.authorizedEndpoints,
      };
    } catch (error) {
      return null;
    }
  }

  // Sanitize user info by removing password
  sanitizeUser(user: User): UserWithoutPassword {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as UserWithoutPassword;
  }
}
