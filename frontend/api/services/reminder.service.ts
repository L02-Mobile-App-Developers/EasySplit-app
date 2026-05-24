import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type {
  CreateReminderRequest,
  GetRemindersParams,
  Reminder,
} from "../types/reminder";

import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from "../types/response";

export const reminderService = {
  // GET /groups/:groupId/reminders
  async getReminders(groupId: string, params?: GetRemindersParams) {
    if (!params) {
      params = {
        page: 1,
        limit: 20,
      };
    }
    const response = await apiClient.get<ApiPaginatedResponse<Reminder[]>>(
      ENDPOINTS.GROUPS.REMINDERS(groupId),
      {
        params,
      },
    );

    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // POST /groups/:groupId/reminders
  async createReminder(groupId: string, payload: CreateReminderRequest) {
    const response = await apiClient.post<ApiSuccessResponse<Reminder[]>>(
      ENDPOINTS.GROUPS.REMINDERS(groupId),
      payload,
    );

    return response.data.data;
  },

  // POST /groups/:groupId/reminders/:reminderId/cancel
  async cancelReminder(groupId: string, reminderId: string) {
    const response = await apiClient.post<ApiSuccessResponse<Reminder>>(
      ENDPOINTS.GROUPS.CANCEL_REMINDER(groupId, reminderId),
    );

    return response.data.data;
  },
};
