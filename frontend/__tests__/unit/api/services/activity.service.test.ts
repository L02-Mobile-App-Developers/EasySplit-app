import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { activityService } from "@/api/services/activity.service";
import { apiSuccess } from "../../../helpers/apiMocks";

jest.mock("@/api/client", () => ({
  apiClient: { get: jest.fn() },
}));

describe("activityService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getActivities applies default pagination", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: [{ id: "a1" }],
        meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      },
    });

    const result = await activityService.getActivities("g1");

    expect(result.items).toEqual([{ id: "a1" }]);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.ACTIVITIES("g1"), {
      params: { page: 1, limit: 20 },
    });
  });

  it("getActivities respects provided query", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { data: [], meta: { pagination: { page: 3, limit: 5, total: 0, totalPages: 0 } } },
    });

    await activityService.getActivities("g1", { page: 3, limit: 5 });

    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.ACTIVITIES("g1"), {
      params: { page: 3, limit: 5 },
    });
  });

  it("getHistory returns items and meta", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: [{ id: "h1" }],
        meta: {
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          meta: { days: 30 },
        },
      },
    });

    const result = await activityService.getHistory("g1", { page: 2, limit: 5 });

    expect(result.items).toEqual([{ id: "h1" }]);
    expect(result.meta).toEqual({ days: 30 });
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.HISTORY("g1"), {
      params: { page: 2, limit: 5 },
    });
  });
});
