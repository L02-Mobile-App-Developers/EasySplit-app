import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { meService } from "@/api/services/me.service";
import { apiSuccess } from "../../../helpers/apiMocks";

jest.mock("@/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe("meService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getProfile returns user", async () => {
    const user = { id: "u1", displayName: "A", email: "a@x.com", avatarUrl: null };
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess(user));

    await expect(meService.getProfile()).resolves.toEqual(user);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.ME.PROFILE);
  });

  it("updateProfile patches profile", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue(
      apiSuccess({ id: "u1", displayName: "B", email: null, avatarUrl: null }),
    );

    await meService.updateProfile({ displayName: "B" });

    expect(apiClient.patch).toHaveBeenCalledWith(ENDPOINTS.ME.PROFILE, {
      displayName: "B",
    });
  });

  it("getSubscription and getUsage call me endpoints", async () => {
    (apiClient.get as jest.Mock)
      .mockResolvedValueOnce(apiSuccess({ plan: "free" }))
      .mockResolvedValueOnce(apiSuccess({ groupsUsed: 1 }));

    await meService.getSubscription();
    await meService.getUsage();

    expect(apiClient.get).toHaveBeenNthCalledWith(1, ENDPOINTS.ME.SUBSCRIPTION);
    expect(apiClient.get).toHaveBeenNthCalledWith(2, ENDPOINTS.ME.USAGE);
  });
});
