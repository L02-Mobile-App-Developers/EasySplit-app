import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type { User } from "../types/auth";

import type { ApiSuccessResponse } from "../types/response";

export const meService = {
  async getProfile() {
    const response = await apiClient.get<ApiSuccessResponse<User>>(
      ENDPOINTS.ME.PROFILE,
    );

    return response.data.data;
  },
};
