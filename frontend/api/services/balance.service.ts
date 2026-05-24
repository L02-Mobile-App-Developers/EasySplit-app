import { apiClient } from "../client";

import { ENDPOINTS } from "../endpoints";

import type { Balance } from "../types/balance";

import type { ApiSuccessResponse } from "../types/response";

export const balanceService = {
  // GET /groups/:groupId/balances
  async getBalances(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Balance[]>>(
      ENDPOINTS.GROUPS.BALANCES(groupId),
    );

    return response.data.data;
  },

  // GET /groups/:groupId/balances/me
  async getMyBalance(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Balance>>(
      ENDPOINTS.GROUPS.MY_BALANCE(groupId),
    );

    return response.data.data;
  },
};
