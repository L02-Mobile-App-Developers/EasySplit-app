import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { CreateGroupRequest, Group } from "./types/group";
import type { ApiSuccessResponse } from "./types/response";

export const groupApi = {
  async getAll() {
    const response = await apiClient.get<ApiSuccessResponse<Group[]>>(
      ENDPOINTS.GROUPS.LIST,
    );
    return response.data.data;
  },

  async create(data: CreateGroupRequest) {
    const response = await apiClient.post<ApiSuccessResponse<Group>>(
      ENDPOINTS.GROUPS.LIST,
      data,
    );
    return response.data.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<ApiSuccessResponse<Group>>(
      ENDPOINTS.GROUPS.DETAIL(id),
    );
    return response.data.data;
  },
};
