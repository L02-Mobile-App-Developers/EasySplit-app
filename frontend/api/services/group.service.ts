import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type { CreateGroupRequest, Group } from "../types/group";

import type { ApiSuccessResponse } from "../types/response";

export const groupService = {
  async getGroups() {
    const response = await apiClient.get<ApiSuccessResponse<Group[]>>(
      ENDPOINTS.GROUPS.LIST,
    );

    return response.data.data;
  },

  async createGroup(payload: CreateGroupRequest) {
    const response = await apiClient.post<ApiSuccessResponse<Group>>(
      ENDPOINTS.GROUPS.LIST,
      payload,
    );

    return response.data.data;
  },

  async getGroup(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Group>>(
      ENDPOINTS.GROUPS.DETAIL(groupId),
    );

    return response.data.data;
  },
};
