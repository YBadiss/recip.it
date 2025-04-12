import { Request, Response } from 'express';
import { UserStore } from '../models/user-store';
import { AuthService } from '../services/auth-service';
import { Config } from '../config';

export class UserController {
  private userStore: UserStore;
  private authService: AuthService;

  constructor(userStore: UserStore, authService: AuthService) {
    this.userStore = userStore;
    this.authService = authService;
  }

  // Register a new user
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      // Define default authorized endpoints for new users
      const defaultAuthorizedEndpoints = [
        'GET:/recipes',
        'GET:/recipes/:id',
        'POST:/recipes',
        'PUT:/recipes/:id',
        'POST:/recipes/:id/remove',
      ];

      const userId = await this.userStore.createUser(
        username,
        password,
        defaultAuthorizedEndpoints
      );

      const user = await this.userStore.getUserById(userId);
      if (!user) {
        res.status(500).json({ error: 'Failed to create user' });
        return;
      }

      // Auto-login: Generate JWT token
      const fullUser = await this.userStore.getUserByUsername(username);
      if (!fullUser) {
        res.status(500).json({ error: 'Failed to retrieve full user data' });
        return;
      }

      const token = this.authService.generateToken(fullUser);
      this.setCookie(res, token);

      // Return user info and token
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          authorizedEndpoints: user.authorizedEndpoints,
        },
        token: token, // Include token in response for clients that prefer using Authorization header
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Username already exists') {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }
      console.error('Registration error:', error);
      res.status(500).json({ error: 'An error occurred during registration' });
    }
  }

  // Login a user and generate JWT token
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const user = await this.userStore.validateUser(username, password);
      if (!user) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      // Generate JWT token
      const token = this.authService.generateToken(user);
      this.setCookie(res, token);

      // Send user info without password
      const sanitizedUser = this.authService.sanitizeUser(user);
      res.status(200).json({ user: sanitizedUser, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'An error occurred during login' });
    }
  }

  // Logout a user
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Clear the cookie
      res.clearCookie(Config.COOKIE_NAME);
      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'An error occurred during logout' });
    }
  }

  // Get current user profile
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await this.userStore.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'An error occurred while fetching user profile' });
    }
  }

  // List all users (admin only)
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // This endpoint should only be accessible to users with the specific permission
      // Authorization is handled in the route middleware

      const users = await this.userStore.getAllUsers();

      // Return the list of users with additional recipe count information
      const usersWithStats = await Promise.all(
        users.map(async user => {
          try {
            const recipeCount = user.id ? (await this.userStore.getUserRecipes(user.id)).length : 0;

            return {
              ...user,
              recipeCount,
            };
          } catch (error) {
            console.error(`Error getting recipe count for user ${user.id}:`, error);
            return {
              ...user,
              recipeCount: 0,
              error: 'Failed to retrieve recipe count',
            };
          }
        })
      );

      res.status(200).json({ users: usersWithStats });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'An error occurred while fetching users' });
    }
  }

  private setCookie(res: Response, token: string): void {
    res.cookie(Config.COOKIE_NAME, token, {
      httpOnly: true,
      secure: Config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
}
