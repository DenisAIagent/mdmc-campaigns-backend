import { Request, Response, NextFunction } from 'express';
import { googleAdsService } from '@/services/googleAdsService';
import { ApiResponse } from '@/types/express';
import { logger } from '@/utils/logger';

export class GoogleController {
  async generateOAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const authUrl = await googleAdsService.generateOAuthUrl(req.userId);

      const response: ApiResponse = {
        success: true,
        data: { authUrl },
        message: 'OAuth URL generated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async handleOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.body;

      const result = await googleAdsService.handleOAuthCallback(code, state);

      logger.info('Google OAuth callback processed successfully', { userId: result.userId });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Google authentication successful',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async createLinkRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const { customerId } = req.body;

      await googleAdsService.createCustomerClientLink(req.userId, customerId);

      logger.info('Google Ads link request created', { userId: req.userId, customerId });

      const response: ApiResponse = {
        success: true,
        message: 'Link request sent successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getLinkStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const linkStatus = await googleAdsService.checkLinkStatus(req.userId);

      const response: ApiResponse = {
        success: true,
        data: { linkStatus },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const googleController = new GoogleController();