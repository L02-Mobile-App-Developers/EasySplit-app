import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { expenseService } from "@/api/services/expense.service";
import { apiPaginated, apiSuccess } from "../../../helpers/apiMocks";

jest.mock("@/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("expenseService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("createExpense sends idempotency header", async () => {
    const expense = { id: "e1", title: "Dinner" };
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess(expense));

    await expenseService.createExpense("g1", {
      title: "Dinner",
      amount: 100,
      payerId: "u1",
      splitMode: "equal",
      participants: [],
    } as never);

    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.EXPENSES("g1"),
      expect.any(Object),
      {
        headers: {
          "Idempotency-Key": expect.any(String),
        },
      },
    );
  });

  it("getExpenses returns items and pagination", async () => {
    const items = [{ id: "e1" }];
    (apiClient.get as jest.Mock).mockResolvedValue(apiPaginated(items));

    const result = await expenseService.getExpenses("g1", 2, 10);

    expect(result.items).toEqual(items);
    expect(result.pagination.page).toBe(1);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.EXPENSES("g1"), {
      params: { page: 2, limit: 10 },
    });
  });

  it("getExpense fetches single expense", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess({ id: "e1" }));

    await expenseService.getExpense("g1", "e1");

    expect(apiClient.get).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.EXPENSE_DETAIL("g1", "e1"),
    );
  });

  it("updateExpense patches expense", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue(apiSuccess({ id: "e1" }));

    await expenseService.updateExpense("g1", "e1", { title: "Lunch" } as never);

    expect(apiClient.patch).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.EXPENSE_DETAIL("g1", "e1"),
      { title: "Lunch" },
    );
  });

  it("deleteExpense calls delete endpoint", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue(apiSuccess({ id: "e1" }));

    await expenseService.deleteExpense("g1", "e1");

    expect(apiClient.delete).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.EXPENSE_DETAIL("g1", "e1"),
    );
  });
});
