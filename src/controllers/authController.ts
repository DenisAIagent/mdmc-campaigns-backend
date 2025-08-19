import { Request, Response, NextFunction } from 'express';
import { authService } from '@/services/authService';
import { ApiResponse } from '@/types/express';
import { logger } from '@/utils/logger';

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      const result = await authService.signup({
        email,
        password,
        firstName,
        lastName,
      });

      logger.info('User signed up successfully', { userId: result.user.id, email: result.user.email });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Account created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await authService.login({ email, password });

      logger.info('User logged in successfully', { userId: result.user.id, email: result.user.email });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Logged in successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshToken(refreshToken);

      logger.info('Token refreshed successfully', { userId: result.user.id });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Token refreshed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      await authService.logout(refreshToken);

      logger.info('User logged out successfully', { userId: req.userId });

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      await authService.logoutAll(req.userId);

      logger.info('User logged out from all devices', { userId: req.userId });

      const response: ApiResponse = {
        success: true,
        message: 'Logged out from all devices successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const user = await authService.getUserById(req.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      const response: ApiResponse = {
        success: true,
        data: { user },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const { firstName, lastName } = req.body;

      const user = await authService.updateProfile(req.userId, {
        firstName,
        lastName,
      });

      logger.info('User profile updated', { userId: req.userId });

      const response: ApiResponse = {
        success: true,
        data: { user },
        message: 'Profile updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(req.userId, currentPassword, newPassword);

      logger.info('User password changed', { userId: req.userId });

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      await authService.requestPasswordReset(email);

      logger.info('Password reset requested', { email });

      const response: ApiResponse = {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      await authService.resetPassword(token, newPassword);

      logger.info('Password reset completed');

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();