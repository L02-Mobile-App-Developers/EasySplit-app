import { create } from "zustand";

import { authService } from "@/api/services/auth.service";
import { meService } from "@/api/services/me.service";
import { tokenStorage } from "@/api/storage/token.storage";
import { useFriendStore } from "@/store/friend.store";
import { useGroupStore } from "@/store/group.store";
import { useHistoryStore } from "@/store/history.store";
import { useHomeStore } from "@/store/home.store";

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
  async logout() {
    await tokenStorage.clear();

    useHomeStore.getState().invalidate();
    useHistoryStore.getState().invalidate();
    useFriendStore.getState().invalidate();
    useGroupStore.setState({
      roles: {},
      groupCache: {},
      groupListCache: null,
    });

    set({
      user: null,
      isAuthenticated: false,
    });
  },
}));
