"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignController = exports.CampaignController = void 0;
const zod_1 = require("zod");
const logger_1 = require("@/utils/logger");
const campaignService_1 = require("@/services/campaignService");
const errors_1 = require("@/utils/errors");
// Validation schemas
const createCampaignSchema = zod_1.z.object({
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
});
const updateCampaignSchema = zod_1.z.object({
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
});
class CampaignController {
    async getCampaigns(req, res, next) {
        try {
            if (!req.userId) {
                throw new errors_1.BadRequestError('User ID not found');
            }
            const { page = 1, limit = 10, status, search } = req.query;
            const campaigns = await campaignService_1.campaignService.getUserCampaigns(req.userId, {
                page: Number(page),
                limit: Number(limit),
                status: status,
                search: search,
            });
            const response = {
                success: true,
                data: campaigns,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getCampaign(req, res, next) {
        try {
            if (!req.userId) {
                throw new errors_1.BadRequestError('User ID not found');
            }
            const { id } = req.params;
            const campaign = await campaignService_1.campaignService.getCampaignById(id);
            if (!campaign) {
                throw new errors_1.NotFoundError('Campaign not found');
            }
            // Check if user owns this campaign
            const userAccount = await campaignService_1.campaignService.getUserClientAccount(req.userId);
            if (!userAccount || campaign.clientAccountId !== userAccount.id) {
                throw new errors_1.ForbiddenError('Access denied to this campaign');
            }
            const response = {
                success: true,
                data: { campaign },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async createCampaign(req, res, next) {
        try {
            if (!req.userId) {
                throw new errors_1.BadRequestError('User ID not found');
            }
            const validatedData = createCampaignSchema.parse(req.body);
            const campaign = await campaignService_1.campaignService.createCampaign(req.userId, validatedData);
            logger_1.logger.info('Campaign created successfully', {
                userId: req.userId,
                campaignId: campaign.id,
                clipUrl: campaign.clipUrl
            });
            const response = {
                success: true,
                data: { campaign },
                message: 'Campaign created successfully',
            };
            res.status(201).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async updateCampaign(req, res, next) {
        try {
            if (!req.userId) {
                throw new errors_1.BadRequestError('User ID not found');
            }
            const { id } = req.params;
            const validatedData = updateCampaignSchema.parse(req.body);
            const campaign = await campaignService_1.campaignService.updateCampaign(req.userId, id, validatedData);
            logger_1.logger.info('Campaign updated successfully', {
                userId: req.userId,
                campaignId: id
            });
            const response = {
                success: true,
                data: { campaign },
                message: 'Campaign updated successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async launchCampaign(req, res, next) {
        try {
            if (!req.userId) {
                throw new errors_1.BadRequestError('User ID not found');
            }
            const { id } = req.params;
            const { startsAt } = req.body;
            const campaign = await campaignService_1.campaignService.launchCampaign(req.userId, id, startsAt);
            logger_1.logger.info('Campaign launched successfully', {
                userId: req.userId,
                campaignId: id,
                startsAt
            });
            const response = {
                success: true,
                data: { campaign },
                message: 'Campaign launched successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async pauseCampaign(req, res, next) {
        try {
            if (!req.userId) {
                throw new errors_1.BadRequestError('User ID not found');
            }
            const { id } = req.params;
            const campaign = await campaignService_1.campaignService.pauseCampaign(req.userId, id);
            logger_1.logger.info('Campaign paused successfully', {
                userId: req.userId,
                campaignId: id
            });
            const response = {
                success: true,
                data: { campaign },
                message: 'Campaign paused successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async endCampaign(req, res, next) {
        try {
            if (!req.userId) {
                throw new errors_1.BadRequestError('User ID not found');
            }
            const { id } = req.params;
            const campaign = await campaignService_1.campaignService.endCampaign(req.userId, id);
            logger_1.logger.info('Campaign ended successfully', {
                userId: req.userId,
                campaignId: id
            });
            const response = {
                success: true,
                data: { campaign },
                message: 'Campaign ended successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getCampaignKpis(req, res, next) {
        try {
            if (!req.userId) {
                throw new errors_1.BadRequestError('User ID not found');
            }
            const { id } = req.params;
            const { startDate, endDate, granularity = 'daily' } = req.query;
            const kpis = await campaignService_1.campaignService.getCampaignKpis(req.userId, id, {
                startDate: startDate,
                endDate: endDate,
                granularity: granularity,
            });
            const response = {
                success: true,
                data: { kpis },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteCampaign(req, res, next) {
        try {
            if (!req.userId) {
                throw new errors_1.BadRequestError('User ID not found');
            }
            const { id } = req.params;
            await campaignService_1.campaignService.deleteCampaign(req.userId, id);
            logger_1.logger.info('Campaign deleted successfully', {
                userId: req.userId,
                campaignId: id
            });
            const response = {
                success: true,
                message: 'Campaign deleted successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CampaignController = CampaignController;
exports.campaignController = new CampaignController();
//# sourceMappingURL=campaignController.js.map