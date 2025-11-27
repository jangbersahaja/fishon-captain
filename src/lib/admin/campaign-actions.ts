"use server";

import authOptions from "@/lib/auth";
import {
  createCampaign as apiCreateCampaign,
  deleteCampaign as apiDeleteCampaign,
  getAllCampaigns as apiGetAllCampaigns,
  getCampaign as apiGetCampaign,
  updateCampaign as apiUpdateCampaign,
  type Campaign,
  type CampaignFormData,
} from "@/lib/services/campaign-api";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

/**
 * Check admin/staff access
 */
async function requireAdminAccess(): Promise<string> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user?.id || !["ADMIN", "STAFF"].includes(role || "")) {
    throw new Error("Unauthorized: Admin access required");
  }

  return session.user.id;
}

/**
 * Get all campaigns
 */
export async function getAllCampaigns(): Promise<{
  success: boolean;
  campaigns?: Campaign[];
  error?: string;
}> {
  try {
    const userId = await requireAdminAccess();
    return await apiGetAllCampaigns(userId);
  } catch (error) {
    console.error("[campaign-actions] getAllCampaigns error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch campaigns",
    };
  }
}

/**
 * Get a single campaign by ID
 */
export async function getCampaignForEdit(id: string): Promise<{
  success: boolean;
  campaign?: Campaign;
  error?: string;
}> {
  try {
    const userId = await requireAdminAccess();
    return await apiGetCampaign(id, userId);
  } catch (error) {
    console.error("[campaign-actions] getCampaignForEdit error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch campaign",
    };
  }
}

/**
 * Create a new campaign
 */
export async function createCampaign(data: CampaignFormData): Promise<{
  success: boolean;
  campaignId?: string;
  error?: string;
}> {
  try {
    const userId = await requireAdminAccess();
    const result = await apiCreateCampaign(data, userId);

    if (result.success) {
      revalidatePath("/staff/campaigns");
    }

    return {
      success: result.success,
      campaignId: result.campaign?.id,
      error: result.error,
    };
  } catch (error) {
    console.error("[campaign-actions] createCampaign error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create campaign",
    };
  }
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  id: string,
  data: CampaignFormData
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const userId = await requireAdminAccess();
    const result = await apiUpdateCampaign(id, data, userId);

    if (result.success) {
      revalidatePath("/staff/campaigns");
      revalidatePath(`/staff/campaigns/${id}/edit`);
    }

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    console.error("[campaign-actions] updateCampaign error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update campaign",
    };
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const userId = await requireAdminAccess();
    const result = await apiDeleteCampaign(id, userId);

    if (result.success) {
      revalidatePath("/staff/campaigns");
    }

    return result;
  } catch (error) {
    console.error("[campaign-actions] deleteCampaign error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete campaign",
    };
  }
}
