import { apiClient } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import { groupService } from "@/api/services/group.service";
import { apiSuccess } from "../../../helpers/apiMocks";

jest.mock("@/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("groupService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getGroups returns group list", async () => {
    const groups = [{ id: "g1", name: "Trip" }];
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess(groups));

    await expect(groupService.getGroups()).resolves.toEqual(groups);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.LIST);
  });

  it("createGroup posts payload", async () => {
    const group = { id: "g1", name: "Trip", category: "travel" };
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess(group));

    await groupService.createGroup({ name: "Trip", category: "travel" });

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.GROUPS.LIST, {
      name: "Trip",
      category: "travel",
    });
  });

  it("getGroupMembers uses members endpoint", async () => {
    const members = [{ userId: "u1", role: "owner" }];
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess(members));

    await expect(groupService.getGroupMembers("g1")).resolves.toEqual(members);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.MEMBERS("g1"));
  });

  it("getGroup, updateGroup and closeGroup call correct endpoints", async () => {
    const group = { id: "g1", name: "Trip" };
    (apiClient.get as jest.Mock).mockResolvedValue(apiSuccess(group));
    (apiClient.patch as jest.Mock).mockResolvedValue(apiSuccess(group));
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess(group));

    await groupService.getGroup("g1");
    await groupService.updateGroup("g1", { name: "New" });
    await groupService.closeGroup("g1", "u1");

    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.GROUPS.DETAIL("g1"));
    expect(apiClient.patch).toHaveBeenCalledWith(ENDPOINTS.GROUPS.DETAIL("g1"), {
      name: "New",
    });
    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.GROUPS.CLOSE("g1"), {
      userId: "u1",
    });
  });

  it("addGroupMember and updateGroupMember manage members", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(apiSuccess({ ok: true }));
    (apiClient.patch as jest.Mock).mockResolvedValue(apiSuccess({ ok: true }));

    await groupService.addGroupMember("g1", "u2", "member");
    await groupService.updateGroupMember("g1", "u2", "admin");

    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.GROUPS.MEMBERS("g1"), {
      userId: "u2",
      role: "member",
    });
    expect(apiClient.patch).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.MEMBER_DETAIL("g1", "u2"),
      { role: "admin" },
    );
  });

  it("removeGroupMember calls delete endpoint", async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue(apiSuccess(null));

    await groupService.removeGroupMember("g1", "u2");

    expect(apiClient.delete).toHaveBeenCalledWith(
      ENDPOINTS.GROUPS.DELETE("g1", "u2"),
    );
  });
});
