import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { authService } from "@/api/services/auth.service";
import { apiSuccess } from "../../../helpers/apiMocks";

jest.mock("@/api/client", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe("authService", () => {
  const mockUser = {
    id: "u1",
    displayName: "Test",
    email: "test@example.com",
    avatarUrl: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("login posts credentials and returns auth payload", async () => {
    const payload = {
      accessToken: "a",
      refreshToken: "r",
      user: mockUser,
    };
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess(payload));

    const result = await authService.login({
      email: "test@example.com",
      password: "secret",
    });

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.AUTH.LOGIN, {
      email: "test@example.com",
      password: "secret",
    });
    expect(result).toEqual(payload);
  });

  it("register posts profile data", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(
      apiSuccess({ accessToken: "a", refreshToken: "r", user: mockUser }),
    );

    await authService.register({
      displayName: "Test",
      email: "test@example.com",
      password: "secret",
    });

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.AUTH.REGISTER, {
      displayName: "Test",
      email: "test@example.com",
      password: "secret",
    });
  });

  it("refreshToken sends refresh token body", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(
      apiSuccess({ accessToken: "new", refreshToken: "r2", user: mockUser }),
    );

    await authService.refreshToken("refresh-1");

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.AUTH.REFRESH, {
      refreshToken: "refresh-1",
    });
  });

  it("logout calls logout endpoint", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({});

    await authService.logout();

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.AUTH.LOGOUT);
  });

  it("sync posts to auth sync endpoint", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(
      apiSuccess({ accessToken: "a", refreshToken: "r", user: mockUser }),
    );

    await authService.sync();

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.AUTH.SYNC);
  });
});
