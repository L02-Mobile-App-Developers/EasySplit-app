import axios from "axios";

import { tokenStorage } from "./storage/token.storage";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://172.20.10.10:8080/api/v1";

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
    if (error.response?.status === 401) {
      await tokenStorage.clear();
    }

    return Promise.reject(error);
  },
);
