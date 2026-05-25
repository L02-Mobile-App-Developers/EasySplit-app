import axios from "axios";

import { ENDPOINTS } from "./endpoints";
import { tokenStorage } from "./storage/token.storage";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://172.20.10.10:8080/api/v1";

let refreshPromise: Promise<string | null> | null = null;

export const apiClient = axios.create({
  baseURL: BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isUnauthorized = error.response?.status === 401;
    const isRefreshRequest = originalRequest?.url?.includes(ENDPOINTS.AUTH.REFRESH);

    if (!isUnauthorized || originalRequest?._retry || isRefreshRequest) {
      if (isUnauthorized) {
        await tokenStorage.clear();
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      await tokenStorage.clear();
      return Promise.reject(error);
    }

    try {
      refreshPromise =
        refreshPromise ??
        axios
          .post(`${BASE_URL}${ENDPOINTS.AUTH.REFRESH}`, { refreshToken })
          .then((response) => {
            const data = response.data?.data;
            if (!data?.accessToken || !data?.refreshToken) return null;
            return tokenStorage
              .setTokens(data.accessToken, data.refreshToken)
              .then(() => data.accessToken as string);
          })
          .finally(() => {
            refreshPromise = null;
          });

      const nextAccessToken = await refreshPromise;
      if (!nextAccessToken) {
        await tokenStorage.clear();
        return Promise.reject(error);
      }

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

      return apiClient.request(originalRequest);
    } catch {
      await tokenStorage.clear();
      return Promise.reject(error);
    }
  },
);
