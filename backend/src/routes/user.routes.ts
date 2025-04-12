import express from 'express';
import { UserController } from '../controllers/user-controller';
import { AuthMiddleware } from '../middleware/auth-middleware';

export const createUserRouter = (
  userController: UserController,
  authMiddleware: AuthMiddleware
): express.Router => {
  const router = express.Router();

  // Public routes
  router.post('/register', userController.register.bind(userController));
  router.post('/login', userController.login.bind(userController));
  router.post('/logout', userController.logout.bind(userController));

  // Protected routes
  router.get(
    '/profile',
    authMiddleware.authenticate,
    userController.getCurrentUser.bind(userController)
  );

  // Admin-only routes
  router.get(
    '/list',
    authMiddleware.authenticate,
    authMiddleware.authorize('GET:/users/list'),
    userController.getAllUsers.bind(userController)
  );

  return router;
};
