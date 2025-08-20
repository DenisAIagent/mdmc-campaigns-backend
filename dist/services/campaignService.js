"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignService = exports.CampaignService = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
const auditService_1 = require("./auditService");
const prisma = new client_1.PrismaClient();
class CampaignService {
    async getUserClientAccount(userId) {
        return await prisma.clientAccount.findUnique({
            where: { userId },
        });
    }
    async getUserCampaigns(userId, filters) {
        const clientAccount = await this.getUserClientAccount(userId);
        if (!clientAccount) {
            throw new errors_1.NotFoundError('Client account not found');
        }
        const { page, limit, status, search } = filters;
        const skip = (page - 1) * limit;
        const where = {
            clientAccountId: clientAccount.id,
        };
        if (status && status !== 'all') {
            where.status = status.toUpperCase();
        }
        if (search) {
            where.OR = [
                { clipTitle: { contains: search, mode: 'insensitive' } },
                { artistsList: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [campaigns, total] = await Promise.all([
            prisma.campaignRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            kpiDaily: true,
                            payments: true,
                        },
                    },
                },
            }),
            prisma.campaignRequest.count({ where }),
        ]);
        return {
            campaigns,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async getCampaignById(campaignId) {
        return await prisma.campaignRequest.findUnique({
            where: { id: campaignId },
            include: {
                clientAccount: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                kpiDaily: {
                    orderBy: { date: 'desc' },
                    take: 30, // Last 30 days
                },
                payments: {
                    where: { status: 'PAID' },
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: {
                        kpiDaily: true,
                        alerts: true,
                    },
                },
            },
        });
    }
    async createCampaign(userId, data) {
        const clientAccount = await this.getUserClientAccount(userId);
        if (!clientAccount) {
            throw new errors_1.NotFoundError('Client account not found. Please connect your Google Ads account first.');
        }
        // Check campaign limits per user
        const campaignCount = await prisma.campaignRequest.count({
            where: { clientAccountId: clientAccount.id },
        });
        if (campaignCount >= env_1.env.MAX_CAMPAIGNS_PER_USER) {
            throw new errors_1.ConflictError(`Maximum ${env_1.env.MAX_CAMPAIGNS_PER_USER} campaigns allowed per user`);
        }
        // Validate YouTube URL
        if (!this.isValidYouTubeUrl(data.clipUrl)) {
            throw new errors_1.BadRequestError('Invalid YouTube URL');
        }
        // Calculate campaign end date
        const startsAt = new Date();
        const endsAt = new Date(startsAt);
        endsAt.setDate(endsAt.getDate() + env_1.env.CAMPAIGN_DURATION_DAYS);
        const campaign = await prisma.campaignRequest.create({
            data: {
                clientAccountId: clientAccount.id,
                clipUrl: data.clipUrl,
                clipTitle: data.clipTitle,
                artistsList: data.artistsList,
                countries: data.countries,
                durationDays: env_1.env.CAMPAIGN_DURATION_DAYS,
                status: client_1.CampaignStatus.DRAFT,
                startsAt,
                endsAt,
                targetingConfig: data.targetingConfig || {},
                budgetConfig: data.budgetConfig,
            },
            include: {
                clientAccount: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        // Log audit
        await auditService_1.auditService.log({
            userId,
            action: 'CREATE',
            resource: 'CampaignRequest',
            resourceId: campaign.id,
            newValues: {
                clipTitle: campaign.clipTitle,
                clipUrl: campaign.clipUrl,
                countries: campaign.countries,
            },
        });
        logger_1.logger.info('Campaign created', {
            campaignId: campaign.id,
            userId,
            clipUrl: data.clipUrl,
        });
        return campaign;
    }
    async updateCampaign(userId, campaignId, data) {
        const campaign = await this.getCampaignById(campaignId);
        if (!campaign) {
            throw new errors_1.NotFoundError('Campaign not found');
        }
        // Check ownership
        if (campaign.clientAccount.userId !== userId) {
            throw new errors_1.ForbiddenError('Access denied to this campaign');
        }
        // Only allow updates for DRAFT campaigns
        if (campaign.status !== client_1.CampaignStatus.DRAFT) {
            throw new errors_1.BadRequestError('Can only update campaigns in DRAFT status');
        }
        const oldValues = {
            clipTitle: campaign.clipTitle,
            artistsList: campaign.artistsList,
            countries: campaign.countries,
            targetingConfig: campaign.targetingConfig,
            budgetConfig: campaign.budgetConfig,
        };
        const updatedCampaign = await prisma.campaignRequest.update({
            where: { id: campaignId },
            data: {
                ...(data.clipTitle && { clipTitle: data.clipTitle }),
                ...(data.artistsList && { artistsList: data.artistsList }),
                ...(data.countries && { countries: data.countries }),
                ...(data.targetingConfig && { targetingConfig: data.targetingConfig }),
                ...(data.budgetConfig && { budgetConfig: data.budgetConfig }),
            },
            include: {
                clientAccount: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        // Log audit
        await auditService_1.auditService.log({
            userId,
            action: 'UPDATE',
            resource: 'CampaignRequest',
            resourceId: campaignId,
            oldValues,
            newValues: data,
        });
        return updatedCampaign;
    }
    async launchCampaign(userId, campaignId, startsAt) {
        const campaign = await this.getCampaignById(campaignId);
        if (!campaign) {
            throw new errors_1.NotFoundError('Campaign not found');
        }
        // Check ownership
        if (campaign.clientAccount.userId !== userId) {
            throw new errors_1.ForbiddenError('Access denied to this campaign');
        }
        // Only allow launch for DRAFT campaigns
        if (campaign.status !== client_1.CampaignStatus.DRAFT) {
            throw new errors_1.BadRequestError('Can only launch campaigns in DRAFT status');
        }
        // Check if payment is completed
        const paidPayment = await prisma.payment.findFirst({
            where: {
                campaignId: campaignId,
                status: 'PAID',
            },
        });
        if (!paidPayment) {
            throw new errors_1.BadRequestError('Campaign payment required before launch');
        }
        const startDate = startsAt ? new Date(startsAt) : new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + campaign.durationDays);
        const updatedCampaign = await prisma.campaignRequest.update({
            where: { id: campaignId },
            data: {
                status: client_1.CampaignStatus.QUEUED,
                startsAt: startDate,
                endsAt: endDate,
            },
            include: {
                clientAccount: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        // Log audit
        await auditService_1.auditService.log({
            userId,
            action: 'UPDATE',
            resource: 'CampaignRequest',
            resourceId: campaignId,
            oldValues: { status: client_1.CampaignStatus.DRAFT },
            newValues: { status: client_1.CampaignStatus.QUEUED, startsAt: startDate },
        });
        logger_1.logger.info('Campaign launched', {
            campaignId,
            userId,
            startsAt: startDate,
        });
        return updatedCampaign;
    }
    async pauseCampaign(userId, campaignId) {
        const campaign = await this.getCampaignById(campaignId);
        if (!campaign) {
            throw new errors_1.NotFoundError('Campaign not found');
        }
        // Check ownership
        if (campaign.clientAccount.userId !== userId) {
            throw new errors_1.ForbiddenError('Access denied to this campaign');
        }
        // Only allow pause for RUNNING campaigns
        if (campaign.status !== client_1.CampaignStatus.RUNNING) {
            throw new errors_1.BadRequestError('Can only pause campaigns in RUNNING status');
        }
        const updatedCampaign = await prisma.campaignRequest.update({
            where: { id: campaignId },
            data: {
                status: client_1.CampaignStatus.PAUSED,
            },
            include: {
                clientAccount: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        // Log audit
        await auditService_1.auditService.log({
            userId,
            action: 'UPDATE',
            resource: 'CampaignRequest',
            resourceId: campaignId,
            oldValues: { status: client_1.CampaignStatus.RUNNING },
            newValues: { status: client_1.CampaignStatus.PAUSED },
        });
        return updatedCampaign;
    }
    async endCampaign(userId, campaignId) {
        const campaign = await this.getCampaignById(campaignId);
        if (!campaign) {
            throw new errors_1.NotFoundError('Campaign not found');
        }
        // Check ownership
        if (campaign.clientAccount.userId !== userId) {
            throw new errors_1.ForbiddenError('Access denied to this campaign');
        }
        // Allow end for RUNNING, PAUSED, or QUEUED campaigns
        if (![client_1.CampaignStatus.RUNNING, client_1.CampaignStatus.PAUSED, client_1.CampaignStatus.QUEUED].includes(campaign.status)) {
            throw new errors_1.BadRequestError('Can only end campaigns in RUNNING, PAUSED, or QUEUED status');
        }
        const updatedCampaign = await prisma.campaignRequest.update({
            where: { id: campaignId },
            data: {
                status: client_1.CampaignStatus.ENDED,
                actualEndedAt: new Date(),
            },
            include: {
                clientAccount: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        // Log audit
        await auditService_1.auditService.log({
            userId,
            action: 'UPDATE',
            resource: 'CampaignRequest',
            resourceId: campaignId,
            oldValues: { status: campaign.status },
            newValues: { status: client_1.CampaignStatus.ENDED },
        });
        return updatedCampaign;
    }
    async getCampaignKpis(userId, campaignId, filters) {
        const campaign = await this.getCampaignById(campaignId);
        if (!campaign) {
            throw new errors_1.NotFoundError('Campaign not found');
        }
        // Check ownership
        if (campaign.clientAccount.userId !== userId) {
            throw new errors_1.ForbiddenError('Access denied to this campaign');
        }
        const { startDate, endDate, granularity } = filters;
        const where = {
            campaignId,
        };
        if (startDate) {
            where.date = { ...where.date, gte: new Date(startDate) };
        }
        if (endDate) {
            where.date = { ...where.date, lte: new Date(endDate) };
        }
        const kpis = await prisma.kpiDaily.findMany({
            where,
            orderBy: { date: 'asc' },
        });
        // Aggregate data based on granularity
        const aggregatedKpis = this.aggregateKpis(kpis, granularity);
        return {
            kpis: aggregatedKpis,
            summary: this.calculateKpisSummary(kpis),
        };
    }
    async deleteCampaign(userId, campaignId) {
        const campaign = await this.getCampaignById(campaignId);
        if (!campaign) {
            throw new errors_1.NotFoundError('Campaign not found');
        }
        // Check ownership
        if (campaign.clientAccount.userId !== userId) {
            throw new errors_1.ForbiddenError('Access denied to this campaign');
        }
        // Only allow deletion for DRAFT or ENDED campaigns
        if (![client_1.CampaignStatus.DRAFT, client_1.CampaignStatus.ENDED, client_1.CampaignStatus.CANCELLED].includes(campaign.status)) {
            throw new errors_1.BadRequestError('Can only delete campaigns in DRAFT, ENDED, or CANCELLED status');
        }
        await prisma.campaignRequest.delete({
            where: { id: campaignId },
        });
        // Log audit
        await auditService_1.auditService.log({
            userId,
            action: 'DELETE',
            resource: 'CampaignRequest',
            resourceId: campaignId,
            oldValues: {
                clipTitle: campaign.clipTitle,
                status: campaign.status,
            },
        });
    }
    isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
        return youtubeRegex.test(url);
    }
    aggregateKpis(kpis, granularity) {
        if (granularity === 'daily') {
            return kpis;
        }
        // Implementation for weekly/monthly aggregation would go here
        return kpis;
    }
    calculateKpisSummary(kpis) {
        const summary = {
            totalViews: 0,
            totalClicks: 0,
            totalImpressions: 0,
            totalCostEur: 0,
            avgCtr: 0,
            avgCpv: 0,
        };
        for (const kpi of kpis) {
            summary.totalViews += Number(kpi.views || 0);
            summary.totalClicks += Number(kpi.clicks || 0);
            summary.totalImpressions += Number(kpi.impressions || 0);
            summary.totalCostEur += Number(kpi.costMicros || 0) / 1000000; // Convert micros to euros
        }
        if (summary.totalImpressions > 0) {
            summary.avgCtr = (summary.totalClicks / summary.totalImpressions) * 100;
        }
        if (summary.totalViews > 0) {
            summary.avgCpv = summary.totalCostEur / summary.totalViews;
        }
        return summary;
    }
}
exports.CampaignService = CampaignService;
exports.campaignService = new CampaignService();
//# sourceMappingURL=campaignService.js.map