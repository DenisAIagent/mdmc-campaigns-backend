"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const campaignController_1 = require("@/controllers/campaignController");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const rateLimit_1 = require("@/middleware/rateLimit");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Apply authentication to all campaign routes
router.use(auth_1.authenticate);
// Rate limiting for campaign operations
const campaignRateLimit = (0, rateLimit_1.createRateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: 'Too many campaign requests, please try again later',
});
const createCampaignRateLimit = (0, rateLimit_1.createRateLimit)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 campaign creations per hour
    message: 'Too many campaign creations, please try again later',
});
// Validation schemas
const createCampaignSchema = zod_1.z.object({
    body: zod_1.z.object({
        clipUrl: zod_1.z.string().url('URL YouTube invalide'),
        clipTitle: zod_1.z.string().min(1, 'Titre requis').max(100),
        artistsList: zod_1.z.string().min(1, 'Artistes similaires requis'),
        countries: zod_1.z.array(zod_1.z.string().length(2, 'Code pays invalide')).min(1, 'Au moins un pays requis'),
        targetingConfig: zod_1.z.object({
            ageMin: zod_1.z.number().min(18).max(65).optional(),
            ageMax: zod_1.z.number().min(18).max(65).optional(),
            genders: zod_1.z.array(zod_1.z.enum(['MALE', 'FEMALE', 'UNKNOWN'])).optional(),
            interests: zod_1.z.array(zod_1.z.string()).optional(),
            keywords: zod_1.z.array(zod_1.z.string()).optional(),
        }).optional(),
        budgetConfig: zod_1.z.object({
            dailyBudgetEur: zod_1.z.number().min(5).max(1000),
            totalBudgetEur: zod_1.z.number().min(150).max(30000),
        }),
    }),
});
const updateCampaignSchema = zod_1.z.object({
    body: zod_1.z.object({
        clipTitle: zod_1.z.string().min(1).max(100).optional(),
        artistsList: zod_1.z.string().min(1).optional(),
        countries: zod_1.z.array(zod_1.z.string().length(2)).min(1).optional(),
        targetingConfig: zod_1.z.object({
            ageMin: zod_1.z.number().min(18).max(65).optional(),
            ageMax: zod_1.z.number().min(18).max(65).optional(),
            genders: zod_1.z.array(zod_1.z.enum(['MALE', 'FEMALE', 'UNKNOWN'])).optional(),
            interests: zod_1.z.array(zod_1.z.string()).optional(),
            keywords: zod_1.z.array(zod_1.z.string()).optional(),
        }).optional(),
        budgetConfig: zod_1.z.object({
            dailyBudgetEur: zod_1.z.number().min(5).max(1000).optional(),
            totalBudgetEur: zod_1.z.number().min(150).max(30000).optional(),
        }).optional(),
    }),
});
const launchCampaignSchema = zod_1.z.object({
    body: zod_1.z.object({
        startsAt: zod_1.z.string().datetime().optional(),
    }),
});
const getCampaignsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().transform(Number).default('1'),
        limit: zod_1.z.string().transform(Number).default('10'),
        status: zod_1.z.string().optional(),
        search: zod_1.z.string().optional(),
    }),
});
const getCampaignKpisSchema = zod_1.z.object({
    query: zod_1.z.object({
        startDate: zod_1.z.string().optional(),
        endDate: zod_1.z.string().optional(),
        granularity: zod_1.z.enum(['daily', 'weekly', 'monthly']).default('daily'),
    }),
});
const campaignIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid campaign ID'),
    }),
});
// Routes
/**
 * GET /campaigns
 * Get user's campaigns with filtering and pagination
 */
router.get('/', campaignRateLimit, (0, validation_1.validateRequest)(getCampaignsSchema), campaignController_1.campaignController.getCampaigns);
/**
 * POST /campaigns
 * Create a new campaign
 */
router.post('/', createCampaignRateLimit, (0, validation_1.validateRequest)(createCampaignSchema), campaignController_1.campaignController.createCampaign);
/**
 * GET /campaigns/:id
 * Get campaign details by ID
 */
router.get('/:id', campaignRateLimit, (0, validation_1.validateRequest)(campaignIdSchema), campaignController_1.campaignController.getCampaign);
/**
 * PUT /campaigns/:id
 * Update campaign (only for DRAFT status)
 */
router.put('/:id', campaignRateLimit, (0, validation_1.validateRequest)(campaignIdSchema.merge(updateCampaignSchema)), campaignController_1.campaignController.updateCampaign);
/**
 * PUT /campaigns/:id/launch
 * Launch a campaign
 */
router.put('/:id/launch', campaignRateLimit, (0, validation_1.validateRequest)(campaignIdSchema.merge(launchCampaignSchema)), campaignController_1.campaignController.launchCampaign);
/**
 * PUT /campaigns/:id/pause
 * Pause a running campaign
 */
router.put('/:id/pause', campaignRateLimit, (0, validation_1.validateRequest)(campaignIdSchema), campaignController_1.campaignController.pauseCampaign);
/**
 * PUT /campaigns/:id/end
 * End a campaign
 */
router.put('/:id/end', campaignRateLimit, (0, validation_1.validateRequest)(campaignIdSchema), campaignController_1.campaignController.endCampaign);
/**
 * GET /campaigns/:id/kpis
 * Get campaign KPIs and analytics
 */
router.get('/:id/kpis', campaignRateLimit, (0, validation_1.validateRequest)(campaignIdSchema.merge(getCampaignKpisSchema)), campaignController_1.campaignController.getCampaignKpis);
/**
 * DELETE /campaigns/:id
 * Delete a campaign (only for DRAFT, ENDED, or CANCELLED status)
 */
router.delete('/:id', campaignRateLimit, (0, validation_1.validateRequest)(campaignIdSchema), campaignController_1.campaignController.deleteCampaign);
exports.default = router;
//# sourceMappingURL=campaigns.js.map