import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type {
  CreateSettlementRequest,
  DebtEdge,
  GroupSettlementResponse,
  Settlement,
  SmartSettleResponse,
} from "../types/settlement";

import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from "../types/response";

export const settlementService = {
  async getDebts(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<DebtEdge[]>>(
      ENDPOINTS.GROUPS.DEBTS(groupId),
    );

    return response.data.data;
  },

  async generateSmartSettle(
    groupId: string,
    payload?: {
      algorithm?: "min_transfer";
      maxTransfers?: number;
    },
  ) {
    const response = await apiClient.post<
      ApiSuccessResponse<SmartSettleResponse>
    >(ENDPOINTS.GROUPS.SMART_SETTLE(groupId), {
      algorithm: payload?.algorithm ?? "min_transfer",
      maxTransfers: payload?.maxTransfers ?? 50,
    });

    return response.data.data;
  },

  async createSettlement(groupId: string, payload: CreateSettlementRequest) {
    const response = await apiClient.post<ApiSuccessResponse<Settlement>>(
      ENDPOINTS.GROUPS.SETTLEMENTS(groupId),
      payload,
      {
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
        },
      },
    );

    return response.data.data;
  },

  async getSettlements(groupId: string, page: number = 1, limit: number = 20) {
    const response = await apiClient.get<ApiPaginatedResponse<Settlement[]>>(
      ENDPOINTS.GROUPS.SETTLEMENTS(groupId),
      {
        params: {
          page,
          limit,
        },
      },
    );

    return {
      items: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getSettlement(groupId: string, settlementId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Settlement>>(
      ENDPOINTS.GROUPS.SETTLEMENT_DETAIL(groupId, settlementId),
    );

    return response.data.data;
  },

  async groupSettlement(
    groupId: string,
    payload: {
      mode: "simulate" | "commit";
      note?: string;
    },
  ) {
    const response = await apiClient.post<
      ApiSuccessResponse<GroupSettlementResponse>
    >(
      ENDPOINTS.GROUPS.GROUP_SETTLEMENT(groupId),
      payload,
      payload.mode === "commit"
        ? {
            headers: {
              "Idempotency-Key": crypto.randomUUID(),
            },
          }
        : undefined,
    );

    return response.data.data;
  },
};
