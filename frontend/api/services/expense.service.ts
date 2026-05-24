import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type { CreateExpenseInput, Expense } from "../types/expense";

import type { ApiSuccessResponse } from "../types/response";

export const expenseService = {
  async getExpenses(groupId: string) {
    const response = await apiClient.get<ApiSuccessResponse<Expense[]>>(
      ENDPOINTS.GROUPS.EXPENSES(groupId),
    );

    return response.data.data;
  },

  async createExpense(groupId: string, payload: CreateExpenseInput) {
    const response = await apiClient.post<ApiSuccessResponse<Expense>>(
      ENDPOINTS.GROUPS.EXPENSES(groupId),
      payload,
    );

    return response.data.data;
  },
};
