import { Router } from 'express';
import { campaignController } from '@/controllers/campaignController';
import { authenticate } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { createRateLimit } from '@/middleware/rateLimit';
import { z } from 'zod';

const router = Router();

// Apply authentication to all campaign routes
router.use(authenticate);

// Rate limiting for campaign operations
const campaignRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: 'Too many campaign requests, please try again later',
});

const createCampaignRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 campaign creations per hour
  message: 'Too many campaign creations, please try again later',
});

// Validation schemas
const createCampaignSchema = z.object({
  body: z.object({
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
  }),
});

const updateCampaignSchema = z.object({
  body: z.object({
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
  }),
});

const launchCampaignSchema = z.object({
  body: z.object({
    startsAt: z.string().datetime().optional(),
  }),
});

const getCampaignsSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    status: z.string().optional(),
    search: z.string().optional(),
  }),
});

const getCampaignKpisSchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  }),
});

const campaignIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid campaign ID'),
  }),
});

// Routes

/**
 * GET /campaigns
 * Get user's campaigns with filtering and pagination
 */
router.get(
  '/',
  campaignRateLimit,
  validateRequest(getCampaignsSchema),
  campaignController.getCampaigns
);

/**
 * POST /campaigns
 * Create a new campaign
 */
router.post(
  '/',
  createCampaignRateLimit,
  validateRequest(createCampaignSchema),
  campaignController.createCampaign
);

/**
 * GET /campaigns/:id
 * Get campaign details by ID
 */
router.get(
  '/:id',
  campaignRateLimit,
  validateRequest(campaignIdSchema),
  campaignController.getCampaign
);

/**
 * PUT /campaigns/:id
 * Update campaign (only for DRAFT status)
 */
router.put(
  '/:id',
  campaignRateLimit,
  validateRequest(campaignIdSchema.merge(updateCampaignSchema)),
  campaignController.updateCampaign
);

/**
 * PUT /campaigns/:id/launch
 * Launch a campaign
 */
router.put(
  '/:id/launch',
  campaignRateLimit,
  validateRequest(campaignIdSchema.merge(launchCampaignSchema)),
  campaignController.launchCampaign
);

/**
 * PUT /campaigns/:id/pause
 * Pause a running campaign
 */
router.put(
  '/:id/pause',
  campaignRateLimit,
  validateRequest(campaignIdSchema),
  campaignController.pauseCampaign
);

/**
 * PUT /campaigns/:id/end
 * End a campaign
 */
router.put(
  '/:id/end',
  campaignRateLimit,
  validateRequest(campaignIdSchema),
  campaignController.endCampaign
);

/**
 * GET /campaigns/:id/kpis
 * Get campaign KPIs and analytics
 */
router.get(
  '/:id/kpis',
  campaignRateLimit,
  validateRequest(campaignIdSchema.merge(getCampaignKpisSchema)),
  campaignController.getCampaignKpis
);

/**
 * DELETE /campaigns/:id
 * Delete a campaign (only for DRAFT, ENDED, or CANCELLED status)
 */
router.delete(
  '/:id',
  campaignRateLimit,
  validateRequest(campaignIdSchema),
  campaignController.deleteCampaign
);

export default router;