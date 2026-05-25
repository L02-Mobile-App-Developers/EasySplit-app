import { tokenStorage } from "@/api/storage/token.storage";

let requestHandler: (config: { headers: Record<string, string> }) => Promise<unknown>;
let responseSuccessHandler: (response: unknown) => unknown;
let responseErrorHandler: (error: unknown) => Promise<unknown>;
const mockPost = jest.fn();
const mockRequest = jest.fn();

const mockAxios = {
  post: (...args: unknown[]) => mockPost(...args),
  create: jest.fn(() => ({
    request: (...args: unknown[]) => mockRequest(...args),
    interceptors: {
      request: {
        use: (handler: typeof requestHandler) => {
          requestHandler = handler;
        },
      },
      response: {
        use: (
          onFulfilled: typeof responseSuccessHandler,
          onRejected: typeof responseErrorHandler,
        ) => {
          responseSuccessHandler = onFulfilled;
          responseErrorHandler = onRejected;
        },
      },
    },
  })),
};

jest.mock("axios", () => ({
  __esModule: true,
  default: mockAxios,
  ...mockAxios,
}));

jest.mock("@/api/storage/token.storage", () => ({
  tokenStorage: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setTokens: jest.fn(),
    clear: jest.fn(),
  },
}));

import "@/api/client";

describe("apiClient interceptors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockReset();
    mockRequest.mockReset();
  });

  it("attaches bearer token when available", async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue("access-123");

    const config = { headers: {} as Record<string, string> };
    const result = (await requestHandler(config)) as typeof config;

    expect(result.headers.Authorization).toBe("Bearer access-123");
  });

  it("skips authorization header when token is missing", async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue(null);

    const config = { headers: {} as Record<string, string> };
    const result = (await requestHandler(config)) as typeof config;

    expect(result.headers.Authorization).toBeUndefined();
  });

  it("passes through successful responses", () => {
    const response = { data: { ok: true } };

    expect(responseSuccessHandler(response)).toBe(response);
  });

  it("refreshes token and retries 401 responses", async () => {
    const originalRequest = { url: "/me", headers: {} as Record<string, string> };
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue("refresh-123");
    mockPost.mockResolvedValue({
      data: {
        data: {
          accessToken: "new-access",
          refreshToken: "new-refresh",
        },
      },
    });
    mockRequest.mockResolvedValue({ data: { ok: true } });

    await expect(
      responseErrorHandler({
        config: originalRequest,
        response: { status: 401 },
      }),
    ).resolves.toEqual({ data: { ok: true } });

    expect(tokenStorage.setTokens).toHaveBeenCalledWith("new-access", "new-refresh");
    expect(originalRequest.headers.Authorization).toBe("Bearer new-access");
    expect(mockRequest).toHaveBeenCalledWith(originalRequest);
    expect(tokenStorage.clear).not.toHaveBeenCalled();
  });

  it("clears tokens on 401 responses when refresh token is missing", async () => {
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);

    await expect(
      responseErrorHandler({ config: { url: "/me", headers: {} }, response: { status: 401 } }),
    ).rejects.toEqual({ config: { url: "/me", headers: {} }, response: { status: 401 } });

    expect(tokenStorage.clear).toHaveBeenCalled();
  });
});
