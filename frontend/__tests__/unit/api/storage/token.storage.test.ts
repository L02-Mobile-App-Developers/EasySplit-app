import AsyncStorage from "@react-native-async-storage/async-storage";

import { tokenStorage } from "@/api/storage/token.storage";

describe("tokenStorage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it("stores and reads access and refresh tokens", async () => {
    await tokenStorage.setTokens("access-1", "refresh-1");

    await expect(tokenStorage.getAccessToken()).resolves.toBe("access-1");
    await expect(tokenStorage.getRefreshToken()).resolves.toBe("refresh-1");
  });

  it("clears stored tokens", async () => {
    await tokenStorage.setTokens("access-1", "refresh-1");
    await tokenStorage.clear();

    await expect(tokenStorage.getAccessToken()).resolves.toBeNull();
    await expect(tokenStorage.getRefreshToken()).resolves.toBeNull();
  });

  it("uses web localStorage when AsyncStorage is empty", async () => {
    await AsyncStorage.clear();

    const store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };

    Object.defineProperty(global, "window", {
      value: { localStorage: localStorageMock },
      configurable: true,
    });

    localStorageMock.setItem("accessToken", "web-access");
    localStorageMock.setItem("refreshToken", "web-refresh");

    await expect(tokenStorage.getAccessToken()).resolves.toBe("web-access");
    await expect(tokenStorage.getRefreshToken()).resolves.toBe("web-refresh");

    await tokenStorage.clear();
    await expect(tokenStorage.getAccessToken()).resolves.toBeNull();

    Reflect.deleteProperty(global, "window");
  });
});
