import { authService } from "@/api/services/auth.service";
import { meService } from "@/api/services/me.service";
import { tokenStorage } from "@/api/storage/token.storage";
import { useAuthStore } from "@/store/auth.store";

jest.mock("@/api/services/auth.service", () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
  },
}));

jest.mock("@/api/services/me.service", () => ({
  meService: {
    getProfile: jest.fn(),
  },
}));

jest.mock("@/api/storage/token.storage", () => ({
  tokenStorage: {
    setTokens: jest.fn(),
    getAccessToken: jest.fn(),
    clear: jest.fn(),
  },
}));

const mockUser = {
  id: "u1",
  displayName: "Test User",
  email: "test@example.com",
  avatarUrl: null,
};

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
    jest.clearAllMocks();
  });

  it("login stores tokens and user", async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      user: mockUser,
    });

    await useAuthStore.getState().login("test@example.com", "secret");

    expect(tokenStorage.setTokens).toHaveBeenCalledWith("access", "refresh");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it("register stores tokens and user", async () => {
    (authService.register as jest.Mock).mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      user: mockUser,
    });

    await useAuthStore
      .getState()
      .register("Test User", "test@example.com", "secret");

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("fetchMe sets user when profile loads", async () => {
    (meService.getProfile as jest.Mock).mockResolvedValue(mockUser);

    await useAuthStore.getState().fetchMe();

    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("fetchMe clears auth state on failure", async () => {
    (meService.getProfile as jest.Mock).mockRejectedValue(new Error("401"));

    await useAuthStore.getState().fetchMe();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("bootstrap fetches profile when access token exists", async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue("access");
    (meService.getProfile as jest.Mock).mockResolvedValue(mockUser);

    await useAuthStore.getState().bootstrap();

    expect(meService.getProfile).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it("bootstrap keeps user logged out when token is missing", async () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue(null);

    await useAuthStore.getState().bootstrap();

    expect(meService.getProfile).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it("logout clears tokens and user", async () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });

    await useAuthStore.getState().logout();

    expect(tokenStorage.clear).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
