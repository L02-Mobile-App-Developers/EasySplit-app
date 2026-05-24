import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type { User } from "../types/auth";
import { Subscription, Usage } from "../types/me";

import type { ApiSuccessResponse } from "../types/response";

export const meService = {
  // GET /me
  async getProfile() {
    const response = await apiClient.get<ApiSuccessResponse<User>>(
      ENDPOINTS.ME.PROFILE,
    );

    return response.data.data;
  },

  // PATCH /me
  async updateProfile(data: {
    displayName?: string;
    avatarUrl?: string | null;
  }) {
    const response = await apiClient.patch<ApiSuccessResponse<User>>(
      ENDPOINTS.ME.PROFILE,
      data,
    );
    return response.data.data;
  },

  // GET /me/subscription
  async getSubscription() {
    const response = await apiClient.get<ApiSuccessResponse<Subscription>>(
      ENDPOINTS.ME.SUBSCRIPTION,
    );
    return response.data.data;
  },

  // GET /me/usage
  async getUsage() {
    const response = await apiClient.get<ApiSuccessResponse<Usage>>(
      ENDPOINTS.ME.USAGE,
    );
    return response.data.data;
  },
};
