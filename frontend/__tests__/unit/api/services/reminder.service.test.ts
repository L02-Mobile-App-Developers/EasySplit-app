import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { reminderService } from "@/api/services/reminder.service";
import { apiPaginated, apiSuccess } from "../../../helpers/apiMocks";

jest.mock("@/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("reminderService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getReminders applies default params", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(
      apiPaginated([{ id: "r1" }]),
    );

    const result = await reminderService.getReminders("g1");

    expect(result.data).toEqual([{ id: "r1" }]);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.REMINDERS("g1"), {
      params: { page: 1, limit: 20 },
    });
  });

  it("getReminders forwards custom params", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(apiPaginated([]));

    await reminderService.getReminders("g1", { page: 2, limit: 5, status: "pending" } as never);

    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.REMINDERS("g1"), {
      params: { page: 2, limit: 5, status: "pending" },
    });
  });

  it("createReminder posts payload", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess([{ id: "r1" }]));

    await reminderService.createReminder("g1", {
      targetUserId: "u2",
      message: "Pay me",
    } as never);

    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.REMINDERS("g1"),
      { targetUserId: "u2", message: "Pay me" },
    );
  });

  it("cancelReminder posts cancel endpoint", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess({ id: "r1" }));

    await reminderService.cancelReminder("g1", "r1");

    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.CANCEL_REMINDER("g1", "r1"),
    );
  });
});
