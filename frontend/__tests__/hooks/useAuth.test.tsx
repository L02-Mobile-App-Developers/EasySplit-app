import { renderHook } from "@testing-library/react-native";

import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";

jest.mock("@/api/services/auth.service", () => ({
  authService: { login: jest.fn(), register: jest.fn() },
}));

jest.mock("@/api/services/me.service", () => ({
  meService: { getProfile: jest.fn() },
}));

jest.mock("@/api/storage/token.storage", () => ({
  tokenStorage: {
    setTokens: jest.fn(),
    clear: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: "u1",
        displayName: "Tester",
        email: "test@example.com",
        avatarUrl: null,
      },
      isAuthenticated: true,
      loading: false,
    });
  });

  it("exposes auth store state and actions", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user?.displayName).toBe("Tester");
    expect(result.current.isAuthenticated).toBe(true);
    expect(typeof result.current.login).toBe("function");
    expect(typeof result.current.logout).toBe("function");
  });
});
