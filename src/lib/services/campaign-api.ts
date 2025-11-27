/**
 * Campaign API Service
 * Proxy service for calling fishon-market internal campaign API
 */

// Base URL for fishon-market internal API
const MARKET_API_BASE_URL =
  process.env.FISHON_MARKET_API_URL || "https://fishon.my";

// Use the same CAPTAIN_API_SECRET as other cross-app integrations
const CAPTAIN_API_SECRET = process.env.CAPTAIN_API_SECRET;

export interface CampaignContent {
  title: string;
  subtitle: string;
  cta: string;
  ctaHref?: string; // Custom CTA link (defaults to /register if not provided)
  benefits?: string[];
  imageUrl?: string;
}

export interface CampaignPlacement {
  id?: string;
  placementKey: string;
  devices: string[];
  position:
    | "RIGHT_SIDEBAR"
    | "LEFT_SIDEBAR"
    | "BOTTOM_FIXED"
    | "TOP_BANNER"
    | "MODAL_CENTER"
    | "INLINE_CONTENT";
  sticky?: boolean;
  displayRules?: Record<string, unknown>;
  layoutConfig?: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  code: string;
  type:
    | "REGISTRATION_INCENTIVE"
    | "SEASONAL_PROMOTION"
    | "PARTNER_OFFER"
    | "ANNOUNCEMENT";
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  priority: number;
  startDate: string | null;
  endDate: string | null;
  targetGuests: boolean;
  targetRegistered: boolean;
  excludeRoles: string[];
  allowedPages: string[];
  allowedDevices: string[];
  contentEn: CampaignContent;
  contentMy: CampaignContent;
  dismissalStrategy:
    | "SESSION_ONLY"
    | "SESSION_WITH_COOLDOWN"
    | "PERMANENT"
    | "MAX_DISMISSALS";
  cooldownDays: number | null;
  maxDismissals: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  placements: CampaignPlacement[];
}

export interface CampaignFormData {
  code: string;
  type: Campaign["type"];
  status: Campaign["status"];
  priority: number;
  startDate: Date | null;
  endDate: Date | null;
  targetGuests: boolean;
  targetRegistered: boolean;
  excludeRoles: string[];
  allowedPages: string[];
  allowedDevices: string[];
  contentEn: CampaignContent;
  contentMy: CampaignContent;
  dismissalStrategy: Campaign["dismissalStrategy"];
  cooldownDays: number | null;
  maxDismissals: number | null;
  placements: Omit<CampaignPlacement, "id">[];
}

interface ApiResponse<T> {
  success: boolean;
  error?: string;
  campaign?: T;
  campaigns?: T[];
}

/**
 * Build headers for internal API requests
 * Uses the same x-captain-api-secret header as other cross-app integrations
 */
function buildHeaders(userId?: string): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (CAPTAIN_API_SECRET) {
    headers["x-captain-api-secret"] = CAPTAIN_API_SECRET;
  }

  if (userId) {
    headers["x-user-id"] = userId;
  }

  return headers;
}

/**
 * Get all campaigns
 */
export async function getAllCampaigns(userId?: string): Promise<{
  success: boolean;
  campaigns?: Campaign[];
  error?: string;
}> {
  // Read env at call time to ensure we get the latest values
  const marketApiUrl =
    process.env.FISHON_MARKET_API_URL || "https://fishon.my";
  const apiSecret = process.env.CAPTAIN_API_SECRET;

  const url = `${marketApiUrl}/api/internal/campaigns`;

  console.log("[campaign-api] getAllCampaigns:", {
    url,
    hasSecret: !!apiSecret,
    secretLength: apiSecret?.length,
  });

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (apiSecret) {
      headers["x-captain-api-secret"] = apiSecret;
    }

    if (userId) {
      headers["x-user-id"] = userId;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    // Check content type before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      console.error(
        `[campaign-api] getAllCampaigns: Expected JSON but got ${contentType}. URL: ${url}, Status: ${response.status}`
      );
      return {
        success: false,
        error: `API returned non-JSON response (${response.status}). Is fishon-market running on ${MARKET_API_BASE_URL}?`,
      };
    }

    const data: ApiResponse<Campaign> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to fetch campaigns",
      };
    }

    return { success: true, campaigns: data.campaigns };
  } catch (error) {
    console.error("[campaign-api] getAllCampaigns error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? `${error.message}. Check if fishon-market is running on ${MARKET_API_BASE_URL}`
          : "Network error",
    };
  }
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(
  id: string,
  userId?: string
): Promise<{
  success: boolean;
  campaign?: Campaign;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${MARKET_API_BASE_URL}/api/internal/campaigns/${id}`,
      {
        method: "GET",
        headers: buildHeaders(userId),
        cache: "no-store",
      }
    );

    const data: ApiResponse<Campaign> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to fetch campaign",
      };
    }

    return { success: true, campaign: data.campaign };
  } catch (error) {
    console.error("[campaign-api] getCampaign error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  data: CampaignFormData,
  userId?: string
): Promise<{
  success: boolean;
  campaign?: Campaign;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${MARKET_API_BASE_URL}/api/internal/campaigns`,
      {
        method: "POST",
        headers: buildHeaders(userId),
        body: JSON.stringify(data),
      }
    );

    const result: ApiResponse<Campaign> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to create campaign",
      };
    }

    return { success: true, campaign: result.campaign };
  } catch (error) {
    console.error("[campaign-api] createCampaign error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  id: string,
  data: CampaignFormData,
  userId?: string
): Promise<{
  success: boolean;
  campaign?: Campaign;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${MARKET_API_BASE_URL}/api/internal/campaigns/${id}`,
      {
        method: "PUT",
        headers: buildHeaders(userId),
        body: JSON.stringify(data),
      }
    );

    const result: ApiResponse<Campaign> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to update campaign",
      };
    }

    return { success: true, campaign: result.campaign };
  } catch (error) {
    console.error("[campaign-api] updateCampaign error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(
  id: string,
  userId?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${MARKET_API_BASE_URL}/api/internal/campaigns/${id}`,
      {
        method: "DELETE",
        headers: buildHeaders(userId),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to delete campaign",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[campaign-api] deleteCampaign error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Upload campaign image (calls fishon-market upload endpoint)
 */
export async function uploadCampaignImage(
  file: File,
  campaignCode?: string,
  userId?: string
): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    if (campaignCode) {
      formData.append("campaignCode", campaignCode);
    }

    const headers: HeadersInit = {};
    if (CAPTAIN_API_SECRET) {
      headers["x-captain-api-secret"] = CAPTAIN_API_SECRET;
    }
    if (userId) {
      headers["x-user-id"] = userId;
    }

    const response = await fetch(
      `${MARKET_API_BASE_URL}/api/internal/campaigns/upload-image`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to upload image",
      };
    }

    return { success: true, url: result.url };
  } catch (error) {
    console.error("[campaign-api] uploadCampaignImage error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
