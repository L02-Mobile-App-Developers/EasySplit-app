import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const tokenStorage = {
  async setTokens(accessToken: string, refreshToken: string) {
    try {
      await AsyncStorage.multiSet([
        [ACCESS_TOKEN_KEY, accessToken],
        [REFRESH_TOKEN_KEY, refreshToken],
      ]);
    } catch (e) {
      // ignore
    }

    if (isBrowser()) {
      try {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } catch (e) {
        // ignore storage errors
      }
    }
  },

  async getAccessToken() {
    try {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) return token;
    } catch (e) {
      // ignore
    }

    if (isBrowser()) {
      return window.localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    return null;
  },

  async getRefreshToken() {
    try {
      const token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (token) return token;
    } catch (e) {
      // ignore
    }

    if (isBrowser()) {
      return window.localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    return null;
  },

  async clear() {
    try {
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    } catch (e) {
      // ignore
    }

    if (isBrowser()) {
      try {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch (e) {
        // ignore
      }
    }
  },
};
