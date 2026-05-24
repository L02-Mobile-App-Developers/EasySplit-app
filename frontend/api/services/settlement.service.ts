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

const generateIdempotencyKey = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export const settlementService = {
  // GET /groups/:groupId/debts
  async getDebts(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<DebtEdge[]>>(
      ENDPOINTS.GROUPS.DEBTS(groupId),
    );

    return response.data.data;
  },

  // POST /groups/:groupId/smart-settle/suggestions
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

  // POST /groups/:groupId/settlements
  async createSettlement(groupId: string, payload: CreateSettlementRequest) {
    const response = await apiClient.post<ApiSuccessResponse<Settlement>>(
      ENDPOINTS.GROUPS.SETTLEMENTS(groupId),
      payload,
      {
        headers: {
          "Idempotency-Key": generateIdempotencyKey(),
        },
      },
    );

    return response.data.data;
  },

  // GET /groups/:groupId/settlements
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

  // GET /groups/:groupId/settlements/:settlementId
  async getSettlement(groupId: string, settlementId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Settlement>>(
      ENDPOINTS.GROUPS.SETTLEMENT_DETAIL(groupId, settlementId),
    );

    return response.data.data;
  },

  // POST /groups/:groupId/group-settlement
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
              "Idempotency-Key": generateIdempotencyKey(),
            },
          }
        : undefined,
    );

    return response.data.data;
  },
};
