import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { balanceService } from "@/api/services/balance.service";
import { apiSuccess } from "../../../helpers/apiMocks";

jest.mock("@/api/client", () => ({
  apiClient: { get: jest.fn() },
}));

describe("balanceService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getBalances fetches group balances", async () => {
    const balances = [{ userId: "u1", balance: 10 }];
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess(balances));

    await expect(balanceService.getBalances("g1")).resolves.toEqual(balances);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.BALANCES("g1"));
  });

  it("getMyBalance fetches current user balance", async () => {
    const balance = { userId: "u1", balance: 10 };
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess(balance));

    await expect(balanceService.getMyBalance("g1")).resolves.toEqual(balance);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.MY_BALANCE("g1"));
  });
});
