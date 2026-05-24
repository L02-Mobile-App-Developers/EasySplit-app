import { apiClient } from "../client";
import { ENDPOINTS } from "../endpoints";

import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "../types/auth";

import type { ApiSuccessResponse } from "../types/response";

export const authService = {
  async login(payload: LoginRequest) {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      ENDPOINTS.AUTH.LOGIN,
      payload,
    );

    return response.data.data;
  },

  async register(payload: RegisterRequest) {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      ENDPOINTS.AUTH.REGISTER,
      payload,
    );

    return response.data.data;
  },

  async refreshToken(refreshToken: string) {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      ENDPOINTS.AUTH.REFRESH,
      {
        refreshToken,
      },
    );

    return response.data.data;
  },

  async logout() {
    await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
  },
};
