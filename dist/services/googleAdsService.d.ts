import { LinkStatus } from '@prisma/client';
import type { CampaignConfiguration, AdGroupConfiguration, GoogleAdsMetrics } from '../types/google-ads';
export declare class GoogleAdsService {
    private client;
    private oauth2Client;
    constructor();
    generateOAuthUrl(userId: string, scopes?: string[]): Promise<string>;
    handleOAuthCallback(code: string, state: string): Promise<{
        userId: string;
    }>;
    createCustomerClientLink(userId: string, customerId: string): Promise<void>;
    checkLinkStatus(userId: string): Promise<LinkStatus>;
    createCampaign(userId: string, customerId: string, campaignConfig: CampaignConfiguration): Promise<{
        campaignId: string;
        resourceName: string;
    }>;
    createAdGroup(userId: string, customerId: string, campaignId: string, adGroupConfig: AdGroupConfiguration): Promise<{
        adGroupId: string;
        resourceName: string;
    }>;
    getCampaignMetrics(userId: string, customerId: string, campaignId: string, dateFrom: string, dateTo: string): Promise<GoogleAdsMetrics[]>;
    private createCampaignBudget;
    private getGoogleAdsCredentials;
    private refreshTokens;
    private encryptToken;
    private decryptToken;
}
export declare const googleAdsService: GoogleAdsService;
//# sourceMappingURL=googleAdsService.d.ts.map