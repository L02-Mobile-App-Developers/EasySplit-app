
import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type {
  CreateExpenseRequest,
  Expense,
  UpdateExpenseRequest,
} from "../types/expense";

import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from "../types/response";

const generateIdempotencyKey = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export const expenseService = {
  // POST /groups/:groupId/expenses
  async createExpense(groupId: string, payload: CreateExpenseRequest) {
    const response = await apiClient.post<ApiSuccessResponse<Expense>>(
      ENDPOINTS.GROUPS.EXPENSES(groupId),
      payload,
      {
        headers: {
          "Idempotency-Key": generateIdempotencyKey(),
        },
      },
    );

    return response.data.data;
  },

  // GET /groups/:groupId/expenses
  async getExpenses(groupId: string, page: number = 1, limit: number = 20) {
    const response = await apiClient.get<ApiPaginatedResponse<Expense[]>>(
      ENDPOINTS.GROUPS.EXPENSES(groupId),
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

  // GET /groups/:groupId/expenses/:expenseId
  async getExpense(groupId: string, expenseId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Expense>>(
      ENDPOINTS.GROUPS.EXPENSE_DETAIL(groupId, expenseId),
    );

    return response.data.data;
  },

  // PATCH /groups/:groupId/expenses/:expenseId
  async updateExpense(
    groupId: string,
    expenseId: string,
    payload: UpdateExpenseRequest,
  ) {
    const response = await apiClient.patch<ApiSuccessResponse<Expense>>(
      ENDPOINTS.GROUPS.EXPENSE_DETAIL(groupId, expenseId),
      payload,
    );

    return response.data.data;
  },

  // DELETE /groups/:groupId/expenses/:expenseId
  async deleteExpense(groupId: string, expenseId: string) {
    const response = await apiClient.delete<ApiSuccessResponse<{ id: string }>>(
      ENDPOINTS.GROUPS.EXPENSE_DETAIL(groupId, expenseId),
    );

    return response.data.data; // return deleted expense id
  },
};
