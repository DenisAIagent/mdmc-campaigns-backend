"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAdsService = exports.GoogleAdsService = void 0;
const google_ads_api_1 = require("google-ads-api");
const google_auth_library_1 = require("google-auth-library");
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const client_1 = require("@prisma/client");
class GoogleAdsService {
    client;
    oauth2Client;
    constructor() {
        this.oauth2Client = new google_auth_library_1.OAuth2Client(env_1.env.GOOGLE_CLIENT_ID, env_1.env.GOOGLE_CLIENT_SECRET, `${env_1.env.API_BASE_URL}/google/oauth/callback`);
        this.client = new google_ads_api_1.GoogleAdsApi({
            client_id: env_1.env.GOOGLE_CLIENT_ID,
            client_secret: env_1.env.GOOGLE_CLIENT_SECRET,
            developer_token: env_1.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        });
    }
    async generateOAuthUrl(userId, scopes = [
        'https://www.googleapis.com/auth/adwords',
        'https://www.googleapis.com/auth/youtube.readonly'
    ]) {
        const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state,
            prompt: 'consent',
        });
        return authUrl;
    }
    async handleOAuthCallback(code, state) {
        try {
            // Decode state to get user ID
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            const { userId } = stateData;
            // Exchange code for tokens
            const { tokens } = await this.oauth2Client.getToken(code);
            if (!tokens.access_token || !tokens.refresh_token) {
                throw new errors_1.GoogleAdsApiError('Failed to obtain Google tokens');
            }
            // Encrypt tokens before storing
            const encryptedAccessToken = await this.encryptToken(tokens.access_token);
            const encryptedRefreshToken = await this.encryptToken(tokens.refresh_token);
            // Store tokens in database
            await database_1.prisma.googleTokens.upsert({
                where: { userId },
                update: {
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
                    expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
                    scope: tokens.scope?.split(' ') || [],
                },
                create: {
                    userId,
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
                    expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
                    scope: tokens.scope?.split(' ') || [],
                },
            });
            logger_1.logger.info('Google OAuth tokens stored successfully', { userId });
            return { userId };
        }
        catch (error) {
            logger_1.logger.error('Google OAuth callback error:', error);
            throw new errors_1.GoogleAdsApiError('Failed to process OAuth callback', error);
        }
    }
    async createCustomerClientLink(userId, customerId) {
        try {
            // Validate customer ID format (remove dashes if present)
            const cleanCustomerId = customerId.replace(/-/g, '');
            if (!/^\d{10}$/.test(cleanCustomerId)) {
                throw new errors_1.GoogleAdsApiError('Invalid Google Ads customer ID format');
            }
            // Check if link already exists
            const existingAccount = await database_1.prisma.clientAccount.findFirst({
                where: {
                    OR: [
                        { userId, googleCustomerId: cleanCustomerId },
                        { googleCustomerId: cleanCustomerId, linkStatus: client_1.LinkStatus.LINKED }
                    ]
                }
            });
            if (existingAccount) {
                if (existingAccount.userId === userId) {
                    throw new errors_1.ConflictError('This Google Ads account is already linked to your account');
                }
                else {
                    throw new errors_1.ConflictError('This Google Ads account is already linked to another user');
                }
            }
            // Get Google Ads credentials
            const credentials = await this.getGoogleAdsCredentials(userId);
            const customer = this.client.Customer(credentials);
            // Create customer client link request
            const managerCustomerId = env_1.env.MCC_CUSTOMER_ID.replace(/-/g, '');
            const customerClientLink = {
                client_customer: `customers/${cleanCustomerId}`,
                status: 'PENDING',
                manager_link_id: parseInt(managerCustomerId)
            };
            // Send invitation via Google Ads API
            const response = await customer.customerClientLinks.create([customerClientLink]);
            const resourceName = response.results?.[0]?.resource_name;
            if (!resourceName) {
                throw new errors_1.GoogleAdsApiError('Failed to create customer client link');
            }
            // Store in database
            await database_1.prisma.clientAccount.upsert({
                where: { userId },
                update: {
                    googleCustomerId: cleanCustomerId,
                    linkStatus: client_1.LinkStatus.PENDING,
                    resourceName,
                    linkRequestedAt: new Date(),
                },
                create: {
                    userId,
                    googleCustomerId: cleanCustomerId,
                    linkStatus: client_1.LinkStatus.PENDING,
                    resourceName,
                    linkRequestedAt: new Date(),
                },
            });
            logger_1.logger.info('Customer client link request created', {
                userId,
                customerId: cleanCustomerId,
                resourceName
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to create customer client link:', error);
            if (error instanceof errors_1.GoogleAdsApiError || error instanceof errors_1.ConflictError) {
                throw error;
            }
            throw new errors_1.GoogleAdsApiError('Failed to send Google Ads link request', error);
        }
    }
    async checkLinkStatus(userId) {
        try {
            const clientAccount = await database_1.prisma.clientAccount.findUnique({
                where: { userId }
            });
            if (!clientAccount || !clientAccount.resourceName) {
                return client_1.LinkStatus.PENDING;
            }
            // Get current status from Google Ads API
            const credentials = await this.getGoogleAdsCredentials(userId);
            const customer = this.client.Customer(credentials);
            const managerCustomerId = env_1.env.MCC_CUSTOMER_ID.replace(/-/g, '');
            try {
                const query = `
          SELECT customer_client_link.resource_name, customer_client_link.status
          FROM customer_client_link 
          WHERE customer_client_link.resource_name = '${clientAccount.resourceName}'
        `;
                const response = await customer.report(query);
                const link = response[0];
                let newStatus;
                switch (link?.customer_client_link?.status) {
                    case 'ACTIVE':
                        newStatus = client_1.LinkStatus.LINKED;
                        break;
                    case 'CANCELLED':
                    case 'TERMINATED':
                        newStatus = client_1.LinkStatus.REFUSED;
                        break;
                    default:
                        newStatus = client_1.LinkStatus.PENDING;
                }
                // Update status in database if changed
                if (newStatus !== clientAccount.linkStatus) {
                    await database_1.prisma.clientAccount.update({
                        where: { userId },
                        data: {
                            linkStatus: newStatus,
                            linkedAt: newStatus === client_1.LinkStatus.LINKED ? new Date() : null,
                            lastSyncAt: new Date(),
                        },
                    });
                    logger_1.logger.info('Link status updated', {
                        userId,
                        oldStatus: clientAccount.linkStatus,
                        newStatus
                    });
                }
                return newStatus;
            }
            catch (error) {
                logger_1.logger.warn('Failed to check link status from Google Ads API:', error);
                return clientAccount.linkStatus;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to check link status:', error);
            throw new errors_1.GoogleAdsApiError('Failed to check Google Ads link status', error);
        }
    }
    async createCampaign(userId, customerId, campaignConfig) {
        try {
            const credentials = await this.getGoogleAdsCredentials(userId);
            const customer = this.client.Customer(credentials);
            // Create campaign
            const campaign = {
                name: campaignConfig.name,
                status: campaignConfig.status,
                advertising_channel_type: 'VIDEO',
                campaign_budget: `customers/${customerId}/campaignBudgets/${await this.createCampaignBudget(customer, campaignConfig.budget)}`,
                bidding_strategy_type: campaignConfig.bidding_strategy_type,
                start_date: campaignConfig.start_date,
                end_date: campaignConfig.end_date,
                video_campaign_settings: campaignConfig.video_campaign_settings,
                resource_name: '',
                primary_status: 'UNKNOWN',
                primary_status_reasons: [],
                serving_status: 'UNKNOWN',
                ad_serving_optimization_status: 'UNKNOWN',
                optimization_score: 0,
                experiment_type: 'UNKNOWN',
                tracking_url_template: '',
                url_custom_parameters: [],
                final_url_suffix: '',
                frequency_caps: [],
                real_time_bidding_setting: {},
                network_settings: {},
                hotel_setting: {},
                dynamic_search_ads_setting: {},
                shopping_setting: {},
                targeting_setting: {},
                audience_setting: {},
                geo_target_type_setting: {},
                local_campaign_setting: {},
                app_campaign_setting: {},
                labels: [],
                excluded_parent_asset_field_types: [],
                url_expansion_opt_out: false
            };
            const response = await customer.campaigns.create([campaign]);
            const resourceName = response.results?.[0]?.resource_name;
            if (!resourceName) {
                throw new errors_1.GoogleAdsApiError('Failed to create campaign');
            }
            const campaignId = resourceName.split('/').pop();
            logger_1.logger.info('Campaign created successfully', {
                userId,
                customerId,
                campaignId,
                resourceName
            });
            return { campaignId, resourceName };
        }
        catch (error) {
            logger_1.logger.error('Failed to create campaign:', error);
            throw new errors_1.GoogleAdsApiError('Failed to create Google Ads campaign', error);
        }
    }
    async createAdGroup(userId, customerId, campaignId, adGroupConfig) {
        try {
            const credentials = await this.getGoogleAdsCredentials(userId);
            const customer = this.client.Customer(credentials);
            const adGroup = {
                name: adGroupConfig.name,
                status: adGroupConfig.status,
                type: adGroupConfig.type,
                campaign: `customers/${customerId}/campaigns/${campaignId}`,
                target_cpv: adGroupConfig.target_cpv,
                default_max_cpc: adGroupConfig.default_max_cpc,
            };
            const response = await customer.adGroups.create([adGroup]);
            const resourceName = response.results?.[0]?.resource_name;
            if (!resourceName) {
                throw new errors_1.GoogleAdsApiError('Failed to create ad group');
            }
            const adGroupId = resourceName.split('/').pop();
            logger_1.logger.info('Ad group created successfully', {
                userId,
                customerId,
                campaignId,
                adGroupId,
                resourceName
            });
            return { adGroupId, resourceName };
        }
        catch (error) {
            logger_1.logger.error('Failed to create ad group:', error);
            throw new errors_1.GoogleAdsApiError('Failed to create Google Ads ad group', error);
        }
    }
    async getCampaignMetrics(userId, customerId, campaignId, dateFrom, dateTo) {
        try {
            const credentials = await this.getGoogleAdsCredentials(userId);
            const customer = this.client.Customer(credentials);
            const query = `
        SELECT 
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.video_views,
          metrics.video_quartile_25_rate,
          metrics.video_quartile_50_rate,
          metrics.video_quartile_75_rate,
          metrics.video_quartile_100_rate,
          metrics.video_view_rate,
          metrics.ctr,
          metrics.average_cpv,
          metrics.average_cpm,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign 
        WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        ORDER BY segments.date
      `;
            const response = await customer.query(query);
            const metrics = response.map((row) => ({
                date: row.segments.date,
                impressions: parseInt(row.metrics.impressions || '0'),
                clicks: parseInt(row.metrics.clicks || '0'),
                cost_micros: parseInt(row.metrics.cost_micros || '0'),
                views: parseInt(row.metrics.video_views || '0'),
                video_views: parseInt(row.metrics.video_views || '0'),
                video_quartile_25_rate: parseFloat(row.metrics.video_quartile_25_rate || '0'),
                video_quartile_50_rate: parseFloat(row.metrics.video_quartile_50_rate || '0'),
                video_quartile_75_rate: parseFloat(row.metrics.video_quartile_75_rate || '0'),
                video_quartile_100_rate: parseFloat(row.metrics.video_quartile_100_rate || '0'),
                video_view_rate: parseFloat(row.metrics.video_view_rate || '0'),
                ctr: parseFloat(row.metrics.ctr || '0'),
                average_cpv: parseFloat(row.metrics.average_cpv || '0'),
                average_cpm: parseFloat(row.metrics.average_cpm || '0'),
                conversions: parseFloat(row.metrics.conversions || '0'),
                conversion_value: parseFloat(row.metrics.conversions_value || '0'),
            }));
            return metrics;
        }
        catch (error) {
            logger_1.logger.error('Failed to get campaign metrics:', error);
            throw new errors_1.GoogleAdsApiError('Failed to retrieve campaign metrics', error);
        }
    }
    async createCampaignBudget(customer, budgetConfig) {
        const budget = {
            name: `Budget ${Date.now()}`,
            amount_micros: budgetConfig.amount_micros,
            delivery_method: budgetConfig.delivery_method || 'STANDARD',
        };
        const response = await customer.campaignBudgets.create([budget]);
        const resourceName = response.results[0]?.resource_name;
        if (!resourceName) {
            throw new errors_1.GoogleAdsApiError('Failed to create campaign budget');
        }
        return resourceName.split('/').pop();
    }
    async getGoogleAdsCredentials(userId) {
        const tokens = await database_1.prisma.googleTokens.findUnique({
            where: { userId }
        });
        if (!tokens) {
            throw new errors_1.NotFoundError('Google tokens not found for user');
        }
        const clientAccount = await database_1.prisma.clientAccount.findUnique({
            where: { userId }
        });
        if (!clientAccount?.googleCustomerId) {
            throw new errors_1.NotFoundError('Google customer ID not found for user');
        }
        // Check if token is expired and refresh if needed
        if (tokens.expiresAt < new Date()) {
            await this.refreshTokens(userId);
            return this.getGoogleAdsCredentials(userId);
        }
        const accessToken = await this.decryptToken(tokens.accessToken);
        const refreshToken = await this.decryptToken(tokens.refreshToken);
        return {
            customer_id: clientAccount.googleCustomerId,
            client_id: env_1.env.GOOGLE_CLIENT_ID,
            client_secret: env_1.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            developer_token: env_1.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        };
    }
    async refreshTokens(userId) {
        try {
            const tokens = await database_1.prisma.googleTokens.findUnique({
                where: { userId }
            });
            if (!tokens || !tokens.refreshToken) {
                throw new errors_1.NotFoundError('Refresh token not found');
            }
            const refreshToken = await this.decryptToken(tokens.refreshToken);
            this.oauth2Client.setCredentials({ refresh_token: refreshToken });
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            if (!credentials.access_token) {
                throw new errors_1.GoogleAdsApiError('Failed to refresh access token');
            }
            const encryptedAccessToken = await this.encryptToken(credentials.access_token);
            await database_1.prisma.googleTokens.update({
                where: { userId },
                data: {
                    accessToken: encryptedAccessToken,
                    expiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
                },
            });
            logger_1.logger.info('Google tokens refreshed successfully', { userId });
        }
        catch (error) {
            logger_1.logger.error('Failed to refresh Google tokens:', error);
            throw new errors_1.GoogleAdsApiError('Failed to refresh Google tokens', error);
        }
    }
    async encryptToken(token) {
        // Implement token encryption
        // For now, we'll store as-is but in production you should encrypt
        return token;
    }
    async decryptToken(encryptedToken) {
        // Implement token decryption
        // For now, we'll return as-is but in production you should decrypt
        return encryptedToken;
    }
}
exports.GoogleAdsService = GoogleAdsService;
exports.googleAdsService = new GoogleAdsService();
//# sourceMappingURL=googleAdsService.js.map