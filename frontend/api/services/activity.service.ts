import { apiClient } from "../client";

import { ENDPOINTS } from "../endpoints";

import type {
    ActivityQuery,
    ActivityResponse,
    HistoryQuery,
    HistoryResponse,
} from "../types/activity";

import type { ApiSuccessResponse } from "../types/response";

export const activityService = {
  async getActivities(groupId: string, query?: ActivityQuery) {
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

  async getHistory(groupId: string, query?: HistoryQuery) {
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
