import { PrismaClient, CampaignStatus, CampaignRequest, ClientAccount } from '@prisma/client';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';
import { auditService } from './auditService';

const prisma = new PrismaClient();

interface CreateCampaignData {
  clipUrl: string;
  clipTitle: string;
  artistsList: string;
  countries: string[];
  targetingConfig?: any;
  budgetConfig: {
    dailyBudgetEur: number;
    totalBudgetEur: number;
  };
}

interface UpdateCampaignData {
  clipTitle?: string;
  artistsList?: string;
  countries?: string[];
  targetingConfig?: any;
  budgetConfig?: {
    dailyBudgetEur?: number;
    totalBudgetEur?: number;
  };
}

interface CampaignFilters {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

interface KpiFilters {
  startDate?: string;
  endDate?: string;
  granularity: 'daily' | 'weekly' | 'monthly';
}

export class CampaignService {
  async getUserClientAccount(userId: string): Promise<ClientAccount | null> {
    return await prisma.clientAccount.findUnique({
      where: { userId },
    });
  }

  async getUserCampaigns(userId: string, filters: CampaignFilters) {
    const clientAccount = await this.getUserClientAccount(userId);
    if (!clientAccount) {
      throw new NotFoundError('Client account not found');
    }

    const { page, limit, status, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      clientAccountId: clientAccount.id,
    };

    if (status && status !== 'all') {
      where.status = status.toUpperCase() as CampaignStatus;
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

  async getCampaignById(campaignId: string): Promise<CampaignRequest | null> {
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

  async createCampaign(userId: string, data: CreateCampaignData): Promise<CampaignRequest> {
    const clientAccount = await this.getUserClientAccount(userId);
    if (!clientAccount) {
      throw new NotFoundError('Client account not found. Please connect your Google Ads account first.');
    }

    // Check campaign limits per user
    const campaignCount = await prisma.campaignRequest.count({
      where: { clientAccountId: clientAccount.id },
    });

    if (campaignCount >= env.MAX_CAMPAIGNS_PER_USER) {
      throw new ConflictError(`Maximum ${env.MAX_CAMPAIGNS_PER_USER} campaigns allowed per user`);
    }

    // Validate YouTube URL
    if (!this.isValidYouTubeUrl(data.clipUrl)) {
      throw new BadRequestError('Invalid YouTube URL');
    }

    // Calculate campaign end date
    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + env.CAMPAIGN_DURATION_DAYS);

    const campaign = await prisma.campaignRequest.create({
      data: {
        clientAccountId: clientAccount.id,
        clipUrl: data.clipUrl,
        clipTitle: data.clipTitle,
        artistsList: data.artistsList,
        countries: data.countries,
        durationDays: env.CAMPAIGN_DURATION_DAYS,
        status: CampaignStatus.DRAFT,
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
    await auditService.log({
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

    logger.info('Campaign created', {
      campaignId: campaign.id,
      userId,
      clipUrl: data.clipUrl,
    });

    return campaign;
  }

  async updateCampaign(userId: string, campaignId: string, data: UpdateCampaignData): Promise<CampaignRequest> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Check ownership
    if (campaign.clientAccount.userId !== userId) {
      throw new ForbiddenError('Access denied to this campaign');
    }

    // Only allow updates for DRAFT campaigns
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestError('Can only update campaigns in DRAFT status');
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
    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'CampaignRequest',
      resourceId: campaignId,
      oldValues,
      newValues: data,
    });

    return updatedCampaign;
  }

  async launchCampaign(userId: string, campaignId: string, startsAt?: string): Promise<CampaignRequest> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Check ownership
    if (campaign.clientAccount.userId !== userId) {
      throw new ForbiddenError('Access denied to this campaign');
    }

    // Only allow launch for DRAFT campaigns
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestError('Can only launch campaigns in DRAFT status');
    }

    // Check if payment is completed
    const paidPayment = await prisma.payment.findFirst({
      where: {
        campaignId: campaignId,
        status: 'PAID',
      },
    });

    if (!paidPayment) {
      throw new BadRequestError('Campaign payment required before launch');
    }

    const startDate = startsAt ? new Date(startsAt) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + campaign.durationDays);

    const updatedCampaign = await prisma.campaignRequest.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.QUEUED,
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
    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'CampaignRequest',
      resourceId: campaignId,
      oldValues: { status: CampaignStatus.DRAFT },
      newValues: { status: CampaignStatus.QUEUED, startsAt: startDate },
    });

    logger.info('Campaign launched', {
      campaignId,
      userId,
      startsAt: startDate,
    });

    return updatedCampaign;
  }

  async pauseCampaign(userId: string, campaignId: string): Promise<CampaignRequest> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Check ownership
    if (campaign.clientAccount.userId !== userId) {
      throw new ForbiddenError('Access denied to this campaign');
    }

    // Only allow pause for RUNNING campaigns
    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestError('Can only pause campaigns in RUNNING status');
    }

    const updatedCampaign = await prisma.campaignRequest.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.PAUSED,
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
    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'CampaignRequest',
      resourceId: campaignId,
      oldValues: { status: CampaignStatus.RUNNING },
      newValues: { status: CampaignStatus.PAUSED },
    });

    return updatedCampaign;
  }

  async endCampaign(userId: string, campaignId: string): Promise<CampaignRequest> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Check ownership
    if (campaign.clientAccount.userId !== userId) {
      throw new ForbiddenError('Access denied to this campaign');
    }

    // Allow end for RUNNING, PAUSED, or QUEUED campaigns
    if (![CampaignStatus.RUNNING, CampaignStatus.PAUSED, CampaignStatus.QUEUED].includes(campaign.status)) {
      throw new BadRequestError('Can only end campaigns in RUNNING, PAUSED, or QUEUED status');
    }

    const updatedCampaign = await prisma.campaignRequest.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.ENDED,
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
    await auditService.log({
      userId,
      action: 'UPDATE',
      resource: 'CampaignRequest',
      resourceId: campaignId,
      oldValues: { status: campaign.status },
      newValues: { status: CampaignStatus.ENDED },
    });

    return updatedCampaign;
  }

  async getCampaignKpis(userId: string, campaignId: string, filters: KpiFilters) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Check ownership
    if (campaign.clientAccount.userId !== userId) {
      throw new ForbiddenError('Access denied to this campaign');
    }

    const { startDate, endDate, granularity } = filters;

    const where: any = {
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

  async deleteCampaign(userId: string, campaignId: string): Promise<void> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // Check ownership
    if (campaign.clientAccount.userId !== userId) {
      throw new ForbiddenError('Access denied to this campaign');
    }

    // Only allow deletion for DRAFT or ENDED campaigns
    if (![CampaignStatus.DRAFT, CampaignStatus.ENDED, CampaignStatus.CANCELLED].includes(campaign.status)) {
      throw new BadRequestError('Can only delete campaigns in DRAFT, ENDED, or CANCELLED status');
    }

    await prisma.campaignRequest.delete({
      where: { id: campaignId },
    });

    // Log audit
    await auditService.log({
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

  private isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
  }

  private aggregateKpis(kpis: any[], granularity: string) {
    if (granularity === 'daily') {
      return kpis;
    }

    // Implementation for weekly/monthly aggregation would go here
    return kpis;
  }

  private calculateKpisSummary(kpis: any[]) {
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

export const campaignService = new CampaignService();