import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { settlementService } from "@/api/services/settlement.service";
import { apiPaginated, apiSuccess } from "../../../helpers/apiMocks";

jest.mock("@/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("settlementService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getDebts returns debt edges", async () => {
    const debts = [{ fromUserId: "u1", toUserId: "u2", amount: 50 }];
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess(debts));

    await expect(settlementService.getDebts("g1")).resolves.toEqual(debts);
  });

  it("generateSmartSettle uses defaults", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess({ suggestions: [] }));

    await settlementService.generateSmartSettle("g1");

    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.SMART_SETTLE("g1"),
      { algorithm: "min_transfer", maxTransfers: 50 },
    );
  });

  it("createSettlement sends idempotency header", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess({ id: "s1" }));

    await settlementService.createSettlement("g1", {
      fromUserId: "u1",
      toUserId: "u2",
      amount: 100,
    } as never);

    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.SETTLEMENTS("g1"),
      expect.any(Object),
      {
        headers: {
          "Idempotency-Key": expect.any(String),
        },
      },
    );
  });

  it("getSettlements returns paginated items", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(
      apiPaginated([{ id: "s1" }]),
    );

    const result = await settlementService.getSettlements("g1");

    expect(result.items).toEqual([{ id: "s1" }]);
    expect(apiClient.get).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.SETTLEMENTS("g1"),
      { params: { page: 1, limit: 20 } },
    );
  });

  it("getSettlement fetches settlement detail", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess({ id: "s1" }));

    await settlementService.getSettlement("g1", "s1");

    expect(apiClient.get).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.SETTLEMENT_DETAIL("g1", "s1"),
    );
  });

  it("groupSettlement adds idempotency only for commit", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess({ ok: true }));

    await settlementService.groupSettlement("g1", { mode: "simulate" });
    await settlementService.groupSettlement("g1", { mode: "commit" });

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      ENDPOINTS.GROUPS.GROUP_SETTLEMENT("g1"),
      { mode: "simulate" },
      undefined,
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      ENDPOINTS.GROUPS.GROUP_SETTLEMENT("g1"),
      { mode: "commit" },
      {
        headers: {
          "Idempotency-Key": expect.any(String),
        },
      },
    );
  });
});
