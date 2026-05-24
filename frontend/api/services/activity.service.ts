import { apiClient } from "../client";

import { ENDPOINTS } from "../endpoints";

import type {
  ActivityQuery,
  ActivityResponse,
  HistoryQuery,
  HistoryResponse,
} from "../types/activity";

import type { ApiSuccessResponse } from "../types/response";

// GET /groups/:groupId/activities
export const activityService = {
  async getActivities(groupId: string, query?: ActivityQuery) {
    if (!query) {
      query = {
        page: 1,
        limit: 20,
      };
    }
    const response = await apiClient.get<ApiSuccessResponse<any>>(
      ENDPOINTS.GROUPS.ACTIVITIES(groupId),
      {
        params: query,
      },
    );

    return {
      items: response.data.data,
      pagination: response.data.meta?.pagination,
    } as ActivityResponse;
  },

  // GET /groups/:groupId/history
  async getHistory(groupId: string, query?: HistoryQuery) {
    if (!query) {
      query = {
        page: 1,
        limit: 20,
      };
    }
    const response = await apiClient.get<ApiSuccessResponse<any>>(
      ENDPOINTS.GROUPS.HISTORY(groupId),
      {
        params: query,
      },
    );

    return {
      items: response.data.data,
      pagination: response.data.meta?.pagination,
      meta: response.data.meta?.meta,
    } as HistoryResponse;
  },
};
