import { tokenStorage } from "@/api/storage/token.storage";

let requestHandler: (config: { headers: Record<string, string> }) => Promise<unknown>;
let responseSuccessHandler: (response: unknown) => unknown;
let responseErrorHandler: (error: unknown) => Promise<unknown>;

jest.mock("axios", () => ({
  create: jest.fn(() => ({
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
}));

jest.mock("@/api/storage/token.storage", () => ({
  tokenStorage: {
    getAccessToken: jest.fn(),
    clear: jest.fn(),
  },
}));

import "@/api/client";

describe("apiClient interceptors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("clears tokens on 401 responses", async () => {
    await expect(
      responseErrorHandler({ response: { status: 401 } }),
    ).rejects.toEqual({ response: { status: 401 } });
    expect(tokenStorage.clear).toHaveBeenCalled();
  });
});
