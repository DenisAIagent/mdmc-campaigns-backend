import { GoogleAdsApi, Customer } from 'google-ads-api'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '@/config/database'
import { redis } from '@/config/redis'
import { env } from '@/config/env'
import { logger } from '@/utils/logger'
import { GoogleAdsApiError, NotFoundError, ConflictError } from '@/utils/errors'
import { LinkStatus } from '@prisma/client'
import type { 
  GoogleAdsCredentials, 
  CustomerClientLink, 
  CampaignConfiguration, 
  AdGroupConfiguration,
  VideoAdConfiguration,
  GoogleAdsMetrics 
} from '@/types/google-ads'

export class GoogleAdsService {
  private client: GoogleAdsApi
  private oauth2Client: OAuth2Client

  constructor() {
    this.oauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${env.API_BASE_URL}/google/oauth/callback`
    )

    this.client = new GoogleAdsApi({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      developer_token: env.GOOGLE_ADS_DEVELOPER_TOKEN,
    })
  }

  async generateOAuthUrl(userId: string, scopes: string[] = [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/youtube.readonly'
  ]): Promise<string> {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64')
    
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent',
    })

    return authUrl
  }

  async handleOAuthCallback(code: string, state: string): Promise<{ userId: string }> {
    try {
      // Decode state to get user ID
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      const { userId } = stateData

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code)
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new GoogleAdsApiError('Failed to obtain Google tokens')
      }

      // Encrypt tokens before storing
      const encryptedAccessToken = await this.encryptToken(tokens.access_token)
      const encryptedRefreshToken = await this.encryptToken(tokens.refresh_token!)

      // Store tokens in database
      await prisma.googleTokens.upsert({
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
      })

      logger.info('Google OAuth tokens stored successfully', { userId })
      return { userId }
    } catch (error) {
      logger.error('Google OAuth callback error:', error)
      throw new GoogleAdsApiError('Failed to process OAuth callback', error)
    }
  }

  async createCustomerClientLink(userId: string, customerId: string): Promise<void> {
    try {
      // Validate customer ID format (remove dashes if present)
      const cleanCustomerId = customerId.replace(/-/g, '')
      if (!/^\d{10}$/.test(cleanCustomerId)) {
        throw new GoogleAdsApiError('Invalid Google Ads customer ID format')
      }

      // Check if link already exists
      const existingAccount = await prisma.clientAccount.findFirst({
        where: {
          OR: [
            { userId, googleCustomerId: cleanCustomerId },
            { googleCustomerId: cleanCustomerId, linkStatus: LinkStatus.LINKED }
          ]
        }
      })

      if (existingAccount) {
        if (existingAccount.userId === userId) {
          throw new ConflictError('This Google Ads account is already linked to your account')
        } else {
          throw new ConflictError('This Google Ads account is already linked to another user')
        }
      }

      // Get Google Ads credentials
      const credentials = await this.getGoogleAdsCredentials(userId)
      const customer = this.client.Customer(credentials)

      // Create customer client link request
      const managerCustomerId = env.MCC_CUSTOMER_ID.replace(/-/g, '')
      
      const customerClientLink = {
        client_customer: `customers/${cleanCustomerId}`,
        status: 'PENDING' as const,
        manager_link_id: parseInt(managerCustomerId)
      }

      // Send invitation via Google Ads API
      const response = await customer.customerClientLinks.create([customerClientLink])
      const resourceName = response.results?.[0]?.resource_name

      if (!resourceName) {
        throw new GoogleAdsApiError('Failed to create customer client link')
      }

      // Store in database
      await prisma.clientAccount.upsert({
        where: { userId },
        update: {
          googleCustomerId: cleanCustomerId,
          linkStatus: LinkStatus.PENDING,
          resourceName,
          linkRequestedAt: new Date(),
        },
        create: {
          userId,
          googleCustomerId: cleanCustomerId,
          linkStatus: LinkStatus.PENDING,
          resourceName,
          linkRequestedAt: new Date(),
        },
      })

      logger.info('Customer client link request created', { 
        userId, 
        customerId: cleanCustomerId,
        resourceName 
      })

    } catch (error) {
      logger.error('Failed to create customer client link:', error)
      
      if (error instanceof GoogleAdsApiError || error instanceof ConflictError) {
        throw error
      }
      
      throw new GoogleAdsApiError('Failed to send Google Ads link request', error)
    }
  }

  async checkLinkStatus(userId: string): Promise<LinkStatus> {
    try {
      const clientAccount = await prisma.clientAccount.findUnique({
        where: { userId }
      })

      if (!clientAccount || !clientAccount.resourceName) {
        return LinkStatus.PENDING
      }

      // Get current status from Google Ads API
      const credentials = await this.getGoogleAdsCredentials(userId)
      const customer = this.client.Customer(credentials)

      const managerCustomerId = env.MCC_CUSTOMER_ID.replace(/-/g, '')
      
      try {
        const query = `
          SELECT customer_client_link.resource_name, customer_client_link.status
          FROM customer_client_link 
          WHERE customer_client_link.resource_name = '${clientAccount.resourceName}'
        `
        const response = await customer.report(query)
        const link = response[0]

        let newStatus: LinkStatus
        switch (link?.customer_client_link?.status) {
          case 'ACTIVE':
            newStatus = LinkStatus.LINKED
            break
          case 'CANCELLED':
          case 'TERMINATED':
            newStatus = LinkStatus.REFUSED
            break
          default:
            newStatus = LinkStatus.PENDING
        }

        // Update status in database if changed
        if (newStatus !== clientAccount.linkStatus) {
          await prisma.clientAccount.update({
            where: { userId },
            data: {
              linkStatus: newStatus,
              linkedAt: newStatus === LinkStatus.LINKED ? new Date() : null,
              lastSyncAt: new Date(),
            },
          })

          logger.info('Link status updated', { 
            userId, 
            oldStatus: clientAccount.linkStatus, 
            newStatus 
          })
        }

        return newStatus
      } catch (error) {
        logger.warn('Failed to check link status from Google Ads API:', error)
        return clientAccount.linkStatus
      }
    } catch (error) {
      logger.error('Failed to check link status:', error)
      throw new GoogleAdsApiError('Failed to check Google Ads link status', error)
    }
  }

  async createCampaign(
    userId: string,
    customerId: string,
    campaignConfig: CampaignConfiguration
  ): Promise<{ campaignId: string; resourceName: string }> {
    try {
      const credentials = await this.getGoogleAdsCredentials(userId)
      const customer = this.client.Customer(credentials)

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
        primary_status: 'UNKNOWN' as const,
        primary_status_reasons: [],
        serving_status: 'UNKNOWN' as const,
        ad_serving_optimization_status: 'UNKNOWN' as const,
        optimization_score: 0,
        experiment_type: 'UNKNOWN' as const,
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
      } as any

      const response = await customer.campaigns.create([campaign])
      const resourceName = response.results?.[0]?.resource_name

      if (!resourceName) {
        throw new GoogleAdsApiError('Failed to create campaign')
      }

      const campaignId = resourceName.split('/').pop()!

      logger.info('Campaign created successfully', { 
        userId, 
        customerId, 
        campaignId,
        resourceName 
      })

      return { campaignId, resourceName }
    } catch (error) {
      logger.error('Failed to create campaign:', error)
      throw new GoogleAdsApiError('Failed to create Google Ads campaign', error)
    }
  }

  async createAdGroup(
    userId: string,
    customerId: string,
    campaignId: string,
    adGroupConfig: AdGroupConfiguration
  ): Promise<{ adGroupId: string; resourceName: string }> {
    try {
      const credentials = await this.getGoogleAdsCredentials(userId)
      const customer = this.client.Customer(credentials)

      const adGroup = {
        name: adGroupConfig.name,
        status: adGroupConfig.status,
        type: adGroupConfig.type,
        campaign: `customers/${customerId}/campaigns/${campaignId}`,
        target_cpv: adGroupConfig.target_cpv,
        default_max_cpc: adGroupConfig.default_max_cpc,
      } as any

      const response = await customer.adGroups.create([adGroup])
      const resourceName = response.results?.[0]?.resource_name

      if (!resourceName) {
        throw new GoogleAdsApiError('Failed to create ad group')
      }

      const adGroupId = resourceName.split('/').pop()!

      logger.info('Ad group created successfully', { 
        userId, 
        customerId, 
        campaignId,
        adGroupId,
        resourceName 
      })

      return { adGroupId, resourceName }
    } catch (error) {
      logger.error('Failed to create ad group:', error)
      throw new GoogleAdsApiError('Failed to create Google Ads ad group', error)
    }
  }

  async getCampaignMetrics(
    userId: string,
    customerId: string,
    campaignId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<GoogleAdsMetrics[]> {
    try {
      const credentials = await this.getGoogleAdsCredentials(userId)
      const customer = this.client.Customer(credentials)

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
      `

      const response = await customer.query(query)

      const metrics: GoogleAdsMetrics[] = response.map((row: any) => ({
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
      }))

      return metrics
    } catch (error) {
      logger.error('Failed to get campaign metrics:', error)
      throw new GoogleAdsApiError('Failed to retrieve campaign metrics', error)
    }
  }

  private async createCampaignBudget(customer: Customer, budgetConfig: any): Promise<string> {
    const budget = {
      name: `Budget ${Date.now()}`,
      amount_micros: budgetConfig.amount_micros,
      delivery_method: budgetConfig.delivery_method || 'STANDARD',
    }

    const response = await customer.campaignBudgets.create([budget])
    const resourceName = response.results[0]?.resource_name

    if (!resourceName) {
      throw new GoogleAdsApiError('Failed to create campaign budget')
    }

    return resourceName.split('/').pop()!
  }

  private async getGoogleAdsCredentials(userId: string): Promise<GoogleAdsCredentials> {
    const tokens = await prisma.googleTokens.findUnique({
      where: { userId }
    })

    if (!tokens) {
      throw new NotFoundError('Google tokens not found for user')
    }

    const clientAccount = await prisma.clientAccount.findUnique({
      where: { userId }
    })

    if (!clientAccount?.googleCustomerId) {
      throw new NotFoundError('Google customer ID not found for user')
    }

    // Check if token is expired and refresh if needed
    if (tokens.expiresAt < new Date()) {
      await this.refreshTokens(userId)
      return this.getGoogleAdsCredentials(userId)
    }

    const accessToken = await this.decryptToken(tokens.accessToken)
    const refreshToken = await this.decryptToken(tokens.refreshToken!)

    return {
      customer_id: clientAccount.googleCustomerId,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      developer_token: env.GOOGLE_ADS_DEVELOPER_TOKEN,
    }
  }

  private async refreshTokens(userId: string): Promise<void> {
    try {
      const tokens = await prisma.googleTokens.findUnique({
        where: { userId }
      })

      if (!tokens || !tokens.refreshToken) {
        throw new NotFoundError('Refresh token not found')
      }

      const refreshToken = await this.decryptToken(tokens.refreshToken)
      this.oauth2Client.setCredentials({ refresh_token: refreshToken })

      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token) {
        throw new GoogleAdsApiError('Failed to refresh access token')
      }

      const encryptedAccessToken = await this.encryptToken(credentials.access_token)
      
      await prisma.googleTokens.update({
        where: { userId },
        data: {
          accessToken: encryptedAccessToken,
          expiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
        },
      })

      logger.info('Google tokens refreshed successfully', { userId })
    } catch (error) {
      logger.error('Failed to refresh Google tokens:', error)
      throw new GoogleAdsApiError('Failed to refresh Google tokens', error)
    }
  }

  private async encryptToken(token: string): Promise<string> {
    // Implement token encryption
    // For now, we'll store as-is but in production you should encrypt
    return token
  }

  private async decryptToken(encryptedToken: string): Promise<string> {
    // Implement token decryption
    // For now, we'll return as-is but in production you should decrypt
    return encryptedToken
  }
}

export const googleAdsService = new GoogleAdsService()