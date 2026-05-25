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
    PROFILE: "/me", // get, patch
    SUBSCRIPTION: "/me/subscription", // get
    USAGE: "/me/usage", // get
  },

  USERS: {
    SEARCH: "/users",
  },

  FRIENDS: {
    LIST: "/friends",
    REQUESTS: "/friends/requests",
    SEND: "/friends",
    ACCEPT: (requestId: string) => `/friends/${requestId}/accept`,
    REJECT: (requestId: string) => `/friends/${requestId}`,
    UNFRIEND: (friendId: string) => `/friends/${friendId}/unfriend`,
  },

  GROUPS: {
    LIST: "/groups", // post, get

    DETAIL: (groupId: string) => `/groups/${groupId}`, // get, patch

    CLOSE: (groupId: string) => `/groups/${groupId}/close`, // post

    MEMBERS: (groupId: string) => `/groups/${groupId}/members`, // get, post

    MEMBER_DETAIL: (groupId: string, userId: string) =>
      `/groups/${groupId}/members/${userId}`, // patch, delete

    DELETE: (groupId: string, userId: string) =>
      `/groups/${groupId}/members/${userId}`, // delete

    // Expenses

    EXPENSES: (groupId: string) => `/groups/${groupId}/expenses`,

    EXPENSE_DETAIL: (groupId: string, expenseId: string) =>
      `/groups/${groupId}/expenses/${expenseId}`,

    // Balance

    BALANCES: (groupId: string) => `/groups/${groupId}/balances`, // ok

    MY_BALANCE: (groupId: string) => `/groups/${groupId}/balances/me`, // ok

    // Settlement

    DEBTS: (groupId: string) => `/groups/${groupId}/debts`, // get

    SMART_SETTLE: (groupId: string) =>
      `/groups/${groupId}/smart-settle/suggestions`, // post

    SETTLEMENTS: (groupId: string) => `/groups/${groupId}/settlements`, // get, post

    SETTLEMENT_DETAIL: (groupId: string, settlementId: string) =>
      `/groups/${groupId}/settlements/${settlementId}`, // get

    GROUP_SETTLEMENT: (groupId: string) =>
      `/groups/${groupId}/group-settlement`, // post

    // reminder

    REMINDERS: (groupId: string) => `/groups/${groupId}/reminders`, // get, post

    CANCEL_REMINDER: (groupId: string, reminderId: string) =>
      `/groups/${groupId}/reminders/${reminderId}/cancel`, // post

    // Activity

    ACTIVITIES: (groupId: string) => `/groups/${groupId}/activities`, // get

    HISTORY: (groupId: string) => `/groups/${groupId}/history`, // get
  },
};
