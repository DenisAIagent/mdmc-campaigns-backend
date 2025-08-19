import { CampaignRequest, ClientAccount } from '@prisma/client';
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
export declare class CampaignService {
    getUserClientAccount(userId: string): Promise<ClientAccount | null>;
    getUserCampaigns(userId: string, filters: CampaignFilters): Promise<{
        campaigns: ({
            _count: {
                kpiDaily: number;
                payments: number;
            };
        } & {
            status: import(".prisma/client").$Enums.CampaignStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            clipUrl: string;
            clipTitle: string;
            artistsList: string;
            countries: string[];
            clientAccountId: string;
            durationDays: number;
            startsAt: Date | null;
            endsAt: Date | null;
            actualStartedAt: Date | null;
            actualEndedAt: Date | null;
            googleCampaignId: string | null;
            googleAdGroupId: string | null;
            googleAdIds: string[];
            targetingConfig: import("@prisma/client/runtime/library").JsonValue | null;
            budgetConfig: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getCampaignById(campaignId: string): Promise<CampaignRequest | null>;
    createCampaign(userId: string, data: CreateCampaignData): Promise<CampaignRequest>;
    updateCampaign(userId: string, campaignId: string, data: UpdateCampaignData): Promise<CampaignRequest>;
    launchCampaign(userId: string, campaignId: string, startsAt?: string): Promise<CampaignRequest>;
    pauseCampaign(userId: string, campaignId: string): Promise<CampaignRequest>;
    endCampaign(userId: string, campaignId: string): Promise<CampaignRequest>;
    getCampaignKpis(userId: string, campaignId: string, filters: KpiFilters): Promise<{
        kpis: any[];
        summary: {
            totalViews: number;
            totalClicks: number;
            totalImpressions: number;
            totalCostEur: number;
            avgCtr: number;
            avgCpv: number;
        };
    }>;
    deleteCampaign(userId: string, campaignId: string): Promise<void>;
    private isValidYouTubeUrl;
    private aggregateKpis;
    private calculateKpisSummary;
}
export declare const campaignService: CampaignService;
export {};
//# sourceMappingURL=campaignService.d.ts.map