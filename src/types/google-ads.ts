export interface GoogleAdsCredentials {
  customer_id: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  developer_token: string;
}

export interface CustomerClientLinkRequest {
  customer_id: string;
  client_customer: string;
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'TERMINATED';
}

export interface CustomerClientLink {
  resource_name: string;
  client_customer: string;
  manager_link_id: string;
  status: 'UNKNOWN' | 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'TERMINATED';
  hidden: boolean;
}

export interface CampaignConfiguration {
  name: string;
  status: 'UNKNOWN' | 'ENABLED' | 'PAUSED' | 'REMOVED';
  advertising_channel_type: 'VIDEO';
  bidding_strategy_type: 'TARGET_CPV' | 'MAXIMIZE_CONVERSIONS';
  budget: {
    amount_micros: number;
    delivery_method: 'STANDARD' | 'ACCELERATED';
  };
  start_date: string;
  end_date: string;
  video_campaign_settings?: {
    video_ad_inventory_type: 'YOUTUBE_SEARCH' | 'YOUTUBE_WATCH' | 'VIDEO_PARTNER_SITE';
  };
}

export interface AdGroupConfiguration {
  name: string;
  status: 'UNKNOWN' | 'ENABLED' | 'PAUSED' | 'REMOVED';
  type: 'VIDEO_BUMPER' | 'VIDEO_TRUE_VIEW_IN_STREAM' | 'VIDEO_TRUE_VIEW_DISCOVERY';
  default_max_cpc?: {
    value_micros: number;
  };
  target_cpv?: {
    target_cpv_micros: number;
  };
}

export interface VideoAdConfiguration {
  display_url: string;
  final_urls: string[];
  video: {
    youtube_video_id: string;
  };
  in_stream?: {
    action_button_label?: string;
    action_headline?: string;
  };
  video_discovery?: {
    headline?: string;
    description1?: string;
    description2?: string;
  };
}

export interface GoogleAdsMetrics {
  date: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  views: number;
  video_views: number;
  video_quartile_25_rate: number;
  video_quartile_50_rate: number;
  video_quartile_75_rate: number;
  video_quartile_100_rate: number;
  video_view_rate: number;
  ctr: number;
  average_cpv: number;
  average_cpm: number;
  conversions: number;
  conversion_value: number;
}

export interface AudienceSegment {
  resource_name?: string;
  name: string;
  description?: string;
  members: AudienceSegmentMember[];
}

export interface AudienceSegmentMember {
  keyword?: string;
  url?: string;
  app_id?: string;
  similar_to_channel?: string;
}

export interface GeographicTargeting {
  location_ids: number[];
  location_names: string[];
  radius_units?: 'MILES' | 'KILOMETERS';
  radius?: number;
}

export interface DemographicTargeting {
  age_ranges?: ('AGE_RANGE_18_24' | 'AGE_RANGE_25_34' | 'AGE_RANGE_35_44' | 'AGE_RANGE_45_54' | 'AGE_RANGE_55_64' | 'AGE_RANGE_65_UP')[];
  genders?: ('MALE' | 'FEMALE' | 'UNDETERMINED')[];
  parental_statuses?: ('PARENT' | 'NOT_A_PARENT' | 'UNDETERMINED')[];
}

export interface GoogleAdsError {
  error_code: {
    request_error?: string;
    authentication_error?: string;
    authorization_error?: string;
    quota_error?: string;
    internal_error?: string;
  };
  message: string;
  details: string;
  location?: {
    field_path_elements: Array<{
      field_name: string;
      index?: number;
    }>;
  };
}