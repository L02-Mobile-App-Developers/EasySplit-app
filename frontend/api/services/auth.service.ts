import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "../types/auth";

import type { ApiSuccessResponse } from "../types/response";

export const authService = {
  // POST /auth/login
  async login(payload: LoginRequest) {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      ENDPOINTS.AUTH.LOGIN,
      payload,
    );

    return response.data.data;
  },

  // POST /auth/register
  async register(payload: RegisterRequest) {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      ENDPOINTS.AUTH.REGISTER,
      payload,
    );

    return response.data.data;
  },

  // POST /auth/refresh-token
  async refreshToken(refreshToken: string) {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      ENDPOINTS.AUTH.REFRESH,
      {
        refreshToken,
      },
    );

    return response.data.data;
  },

  // POST /auth/logout
  async logout() {
    await apiClient.post(ENDPOINTS.AUTH.LOGOUT);

    // Clear tokens from local storage or state management
    // localStorage.removeItem("accessToken");
    // localStorage.removeItem("refreshToken");
  },

  // POST /auth/sync
  async sync() {
    const response = await apiClient.post<ApiSuccessResponse<User>>(
      ENDPOINTS.AUTH.SYNC,
    );
    return response.data.data;
  },
};
