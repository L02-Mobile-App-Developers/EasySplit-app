import { create } from "zustand";

import { authService } from "@/api/services/auth.service";
import { meService } from "@/api/services/me.service";
import { tokenStorage } from "@/api/storage/token.storage";

import type { User } from "@/api/types/auth";


interface AuthStore {
  user: User | null;

  isAuthenticated: boolean;

  loading: boolean;

  login: (email: string, password: string) => Promise<void>;

  register: (
    displayName: string,
    email: string,
    password: string,
  ) => Promise<void>;

  fetchMe: () => Promise<void>;

  bootstrap: () => Promise<void>;

  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,

  isAuthenticated: false,

  loading: false,

  async login(email, password) {
    set({ loading: true });

    try {
      const data = await authService.login({
        email,
        password,
      });

      await tokenStorage.setTokens(data.accessToken, data.refreshToken);

      set({
        user: data.user,
        isAuthenticated: true,
      });
    } finally {
      set({ loading: false });
    }
  },

  async register(displayName, email, password) {
    set({ loading: true });

    try {
      const data = await authService.register({
        displayName,
        email,
        password,
      });

      await tokenStorage.setTokens(data.accessToken, data.refreshToken);

      set({
        user: data.user,
        isAuthenticated: true,
      });
    } finally {
      set({ loading: false });
    }
  },

  async fetchMe() {
    try {
      const user = await meService.getProfile();

      set({
        user,
        isAuthenticated: true,
      });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  async bootstrap() {
    set({ loading: true });

    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      await useAuthStore.getState().fetchMe();
    } finally {
      set({ loading: false });
    }
  },

  async logout() {
    await tokenStorage.clear();

    set({
      user: null,
      isAuthenticated: false,
    });
  },
}));
