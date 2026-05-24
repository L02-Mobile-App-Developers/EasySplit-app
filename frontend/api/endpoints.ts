// src/api/endpoints.ts

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://172.20.10.10:8080/api/v1";

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login", // ok
    REGISTER: "/auth/register", // ok
    REFRESH: "/auth/refresh-token", // ok
    LOGOUT: "/auth/logout", // ok
    SYNC: "/auth/sync", // ok
  },

  ME: {
    // ok
    PROFILE: "/me",
    SUBSCRIPTION: "/me/subscription",
    USAGE: "/me/usage",
  },

  GROUPS: {
    LIST: "/groups", // post, get

    DETAIL: (groupId: string) => `/groups/${groupId}`, // get, patch

    CLOSE: (groupId: string) => `/groups/${groupId}/close`, // post

    MEMBERS: (groupId: string) => `/groups/${groupId}/members`, // get, post

    MEMBER_DETAIL: (groupId: string, userId: string) =>
      `/groups/${groupId}/members/${userId}`, // patch, delete

    EXPENSES: (groupId: string) => `/groups/${groupId}/expenses`,

    EXPENSE_DETAIL: (groupId: string, expenseId: string) =>
      `/groups/${groupId}/expenses/${expenseId}`,

    BALANCES: (groupId: string) => `/groups/${groupId}/balances`, // ok

    MY_BALANCE: (groupId: string) => `/groups/${groupId}/balances/me`, // ok

    DEBTS: (groupId: string) => `/groups/${groupId}/debts`,

    SMART_SETTLE: (groupId: string) =>
      `/groups/${groupId}/smart-settle/suggestions`,

    SETTLEMENTS: (groupId: string) => `/groups/${groupId}/settlements`,

    SETTLEMENT_DETAIL: (groupId: string, settlementId: string) =>
      `/groups/${groupId}/settlements/${settlementId}`,

    GROUP_SETTLEMENT: (groupId: string) =>
      `/groups/${groupId}/group-settlement`,

    REMINDERS: (groupId: string) => `/groups/${groupId}/reminders`,

    CANCEL_REMINDER: (groupId: string, reminderId: string) =>
      `/groups/${groupId}/reminders/${reminderId}/cancel`,

    ACTIVITIES: (groupId: string) => `/groups/${groupId}/activities`, // ok

    HISTORY: (groupId: string) => `/groups/${groupId}/history`, // ok
  },
};
