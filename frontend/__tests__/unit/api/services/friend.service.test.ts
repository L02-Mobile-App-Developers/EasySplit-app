import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import {
  acceptFriendRequest,
  listFriends,
  listIncomingRequests,
  rejectFriendRequest,
  sendFriendRequest,
} from "@/api/services/friend.service";
import { apiSuccess } from "../../../helpers/apiMocks";

jest.mock("@/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("friend service", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists friends", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess([{ id: "f1" }]));

    await expect(listFriends()).resolves.toEqual([{ id: "f1" }]);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.FRIENDS.LIST);
  });

  it("lists incoming requests", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess([{ id: "r1" }]));

    await expect(listIncomingRequests()).resolves.toEqual([{ id: "r1" }]);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.FRIENDS.REQUESTS);
  });

  it("sends friend request by email", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess({ ok: true }));

    await sendFriendRequest("friend@example.com");

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.FRIENDS.SEND, {
      email: "friend@example.com",
    });
  });

  it("accepts and rejects requests", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess({ ok: true }));
    (apiClient.delete as jest.Mock).mockResolvedValue(apiSuccess({ ok: true }));

    await acceptFriendRequest("req-1");
    await rejectFriendRequest("req-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      ENDPOINTS.FRIENDS.ACCEPT("req-1"),
    );
    expect(apiClient.delete).toHaveBeenCalledWith(
      ENDPOINTS.FRIENDS.REJECT("req-1"),
    );
  });
});
