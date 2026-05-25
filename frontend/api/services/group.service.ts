import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type {
  CreateGroupRequest,
  Group,
  GroupMember,
  GroupMemberSuccess,
} from "../types/group";

import type { ApiSuccessResponse } from "../types/response";

export const groupService = {
  // GET /groups
  async getGroups() {
    const response = await apiClient.get<ApiSuccessResponse<Group[]>>(
      ENDPOINTS.GROUPS.LIST,
    );

    return response.data.data;
  },

  // POST /groups
  async createGroup(payload: CreateGroupRequest) {
    const response = await apiClient.post<ApiSuccessResponse<Group>>(
      ENDPOINTS.GROUPS.LIST,
      payload,
    );

    return response.data.data;
  },

  // GET /groups/:groupId
  async getGroup(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Group>>(
      ENDPOINTS.GROUPS.DETAIL(groupId),
    );

    return response.data.data;
  },

  // PATCH /groups/:groupId
  async updateGroup(groupId: string, payload: Partial<CreateGroupRequest>) {
    const response = await apiClient.patch<ApiSuccessResponse<Group>>(
      ENDPOINTS.GROUPS.DETAIL(groupId),
      payload,
    );

    return response.data.data;
  },

  // POST /groups/:groupId/close
  async closeGroup(groupId: string, userId: string) {
    const response = await apiClient.post<ApiSuccessResponse<Group>>(
      ENDPOINTS.GROUPS.CLOSE(groupId),
      { userId },
    );
    return response.data.data;
  },

  // DELETE /groups/:groupId
  async deleteGroup(groupId: string) {
    const response = await apiClient.delete<ApiSuccessResponse<null>>(ENDPOINTS.GROUPS.DETAIL(groupId));
    return response.data.data;
  },

  // GET /groups/:groupId/members
  async getGroupMembers(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<GroupMember[]>>(
      ENDPOINTS.GROUPS.MEMBERS(groupId),
    );
    return response.data.data;
  },

  // POST /groups/:groupId/members
  async addGroupMember(
    groupId: string,
    userId: string,
    role: "admin" | "member",
  ) {
    const response = await apiClient.post<
      ApiSuccessResponse<GroupMemberSuccess>
    >(ENDPOINTS.GROUPS.MEMBERS(groupId), { userId, role });
    return response.data.data;
  },

  // PATCH /groups/:groupId/members/:userId
  async updateGroupMember(
    groupId: string,
    userId: string,
    role: "admin" | "member",
  ) {
    const response = await apiClient.patch<
      ApiSuccessResponse<GroupMemberSuccess>
    >(ENDPOINTS.GROUPS.MEMBER_DETAIL(groupId, userId), { role });
    return response.data.data;
  },

  // DELETE /groups/:groupId/members/:userId
  async removeGroupMember(groupId: string, userId: string) {
    const response = await apiClient.delete(
      ENDPOINTS.GROUPS.DELETE(groupId, userId),
    );
    return response.data.data;
  },
};
