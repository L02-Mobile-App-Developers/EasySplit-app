import { authService } from "@/api/services/auth.service";
import { meService } from "@/api/services/me.service";
import { tokenStorage } from "@/api/storage/token.storage";
import { useAuthStore } from "@/store/auth.store";

jest.mock("@/api/services/auth.service", () => ({
  authService: { login: jest.fn() },
}));

jest.mock("@/api/services/me.service", () => ({
  meService: { getProfile: jest.fn() },
}));

jest.mock("@/api/storage/token.storage", () => ({
  tokenStorage: {
    setTokens: jest.fn(),
    getAccessToken: jest.fn(),
    clear: jest.fn(),
  },
}));

describe("auth integration flow", () => {
  const user = {
    id: "u1",
    displayName: "Integration User",
    email: "integration@example.com",
    avatarUrl: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  });

  it("login then fetchMe keeps authenticated session", async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      user,
    });
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue("access");
    (meService.getProfile as jest.Mock).mockResolvedValue(user);

    await useAuthStore.getState().login("integration@example.com", "secret");
    await useAuthStore.getState().fetchMe();

    expect(tokenStorage.setTokens).toHaveBeenCalledWith("access", "refresh");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(user);
  });
});
