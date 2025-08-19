import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiResponse } from '@/types/express';
import { logger } from '@/utils/logger';
import { campaignService } from '@/services/campaignService';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/utils/errors';

// Validation schemas
const createCampaignSchema = z.object({
  clipUrl: z.string().url('URL YouTube invalide'),
  clipTitle: z.string().min(1, 'Titre requis').max(100),
  artistsList: z.string().min(1, 'Artistes similaires requis'),
  countries: z.array(z.string().length(2, 'Code pays invalide')).min(1, 'Au moins un pays requis'),
  targetingConfig: z.object({
    ageMin: z.number().min(18).max(65).optional(),
    ageMax: z.number().min(18).max(65).optional(),
    genders: z.array(z.enum(['MALE', 'FEMALE', 'UNKNOWN'])).optional(),
    interests: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  budgetConfig: z.object({
    dailyBudgetEur: z.number().min(5).max(1000),
    totalBudgetEur: z.number().min(150).max(30000),
  }),
});

const updateCampaignSchema = z.object({
  clipTitle: z.string().min(1).max(100).optional(),
  artistsList: z.string().min(1).optional(),
  countries: z.array(z.string().length(2)).min(1).optional(),
  targetingConfig: z.object({
    ageMin: z.number().min(18).max(65).optional(),
    ageMax: z.number().min(18).max(65).optional(),
    genders: z.array(z.enum(['MALE', 'FEMALE', 'UNKNOWN'])).optional(),
    interests: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  budgetConfig: z.object({
    dailyBudgetEur: z.number().min(5).max(1000).optional(),
    totalBudgetEur: z.number().min(150).max(30000).optional(),
  }).optional(),
});

export class CampaignController {
  async getCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new BadRequestError('User ID not found');
      }

      const { page = 1, limit = 10, status, search } = req.query;

      const campaigns = await campaignService.getUserCampaigns(req.userId, {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        search: search as string,
      });

      const response: ApiResponse = {
        success: true,
        data: campaigns,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new BadRequestError('User ID not found');
      }

      const { id } = req.params;
      const campaign = await campaignService.getCampaignById(id);

      if (!campaign) {
        throw new NotFoundError('Campaign not found');
      }

      // Check if user owns this campaign
      const userAccount = await campaignService.getUserClientAccount(req.userId);
      if (!userAccount || campaign.clientAccountId !== userAccount.id) {
        throw new ForbiddenError('Access denied to this campaign');
      }

      const response: ApiResponse = {
        success: true,
        data: { campaign },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new BadRequestError('User ID not found');
      }

      const validatedData = createCampaignSchema.parse(req.body);

      const campaign = await campaignService.createCampaign(req.userId, validatedData);

      logger.info('Campaign created successfully', { 
        userId: req.userId, 
        campaignId: campaign.id,
        clipUrl: campaign.clipUrl
      });

      const response: ApiResponse = {
        success: true,
        data: { campaign },
        message: 'Campaign created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new BadRequestError('User ID not found');
      }

      const { id } = req.params;
      const validatedData = updateCampaignSchema.parse(req.body);

      const campaign = await campaignService.updateCampaign(req.userId, id, validatedData);

      logger.info('Campaign updated successfully', { 
        userId: req.userId, 
        campaignId: id 
      });

      const response: ApiResponse = {
        success: true,
        data: { campaign },
        message: 'Campaign updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async launchCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new BadRequestError('User ID not found');
      }

      const { id } = req.params;
      const { startsAt } = req.body;

      const campaign = await campaignService.launchCampaign(req.userId, id, startsAt);

      logger.info('Campaign launched successfully', { 
        userId: req.userId, 
        campaignId: id,
        startsAt 
      });

      const response: ApiResponse = {
        success: true,
        data: { campaign },
        message: 'Campaign launched successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async pauseCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new BadRequestError('User ID not found');
      }

      const { id } = req.params;
      const campaign = await campaignService.pauseCampaign(req.userId, id);

      logger.info('Campaign paused successfully', { 
        userId: req.userId, 
        campaignId: id 
      });

      const response: ApiResponse = {
        success: true,
        data: { campaign },
        message: 'Campaign paused successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async endCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new BadRequestError('User ID not found');
      }

      const { id } = req.params;
      const campaign = await campaignService.endCampaign(req.userId, id);

      logger.info('Campaign ended successfully', { 
        userId: req.userId, 
        campaignId: id 
      });

      const response: ApiResponse = {
        success: true,
        data: { campaign },
        message: 'Campaign ended successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getCampaignKpis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new BadRequestError('User ID not found');
      }

      const { id } = req.params;
      const { startDate, endDate, granularity = 'daily' } = req.query;

      const kpis = await campaignService.getCampaignKpis(req.userId, id, {
        startDate: startDate as string,
        endDate: endDate as string,
        granularity: granularity as 'daily' | 'weekly' | 'monthly',
      });

      const response: ApiResponse = {
        success: true,
        data: { kpis },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new BadRequestError('User ID not found');
      }

      const { id } = req.params;
      await campaignService.deleteCampaign(req.userId, id);

      logger.info('Campaign deleted successfully', { 
        userId: req.userId, 
        campaignId: id 
      });

      const response: ApiResponse = {
        success: true,
        message: 'Campaign deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();