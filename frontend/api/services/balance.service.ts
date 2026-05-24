import { apiClient } from "../client";

import { ENDPOINTS } from "../endpoints";

import type { Balance } from "../types/balance";

import type { ApiSuccessResponse } from "../types/response";

export const balanceService = {
  async getBalances(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Balance[]>>(
      ENDPOINTS.GROUPS.BALANCES(groupId),
    );

    return response.data.data;
  },

  async getMyBalance(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Balance>>(
      ENDPOINTS.GROUPS.MY_BALANCE(groupId),
    );

    return response.data.data;
  },
};
