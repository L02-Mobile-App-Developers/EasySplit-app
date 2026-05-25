import { useFriendStore } from "@/store/friend.store";
import { useGroupStore } from "@/store/group.store";
import { useHistoryStore } from "@/store/history.store";
import { useHomeStore } from "@/store/home.store";

describe("cache stores", () => {
  beforeEach(() => {
    useHomeStore.setState({ cache: null });
    useHistoryStore.setState({ cache: null });
    useFriendStore.setState({ cache: null });
    useGroupStore.setState({
      roles: {},
      groupCache: {},
      groupListCache: null,
    });
  });

  it("home store caches and invalidates", () => {
    const data = {
      groups: [{ id: "g1" }],
      recentActivities: [{ id: "a1" }],
      netBalance: 10,
      owedBalance: 4,
      receivableBalance: 14,
    };

    useHomeStore.getState().setCache(data);
    expect(useHomeStore.getState().getCache()).toEqual(data);
    expect(useHomeStore.getState().getCacheEntry()?.data).toEqual(data);

    useHomeStore.getState().invalidate();
    expect(useHomeStore.getState().getCache()).toBeNull();
    expect(useHomeStore.getState().getCacheEntry()).toBeNull();
  });

  it("history store caches and invalidates", () => {
    const data = { activeGroup: { id: "g1" }, transactions: [{ id: "t1" }] };

    useHistoryStore.getState().setCache(data);
    expect(useHistoryStore.getState().getCache()).toEqual(data);
    expect(useHistoryStore.getState().getCacheEntry()?.data).toEqual(data);

    useHistoryStore.getState().invalidate();
    expect(useHistoryStore.getState().getCache()).toBeNull();
    expect(useHistoryStore.getState().getCacheEntry()).toBeNull();
  });

  it("friend store caches and invalidates", () => {
    const data = { friends: [{ id: "u1" }], requests: [{ id: "r1" }] };

    useFriendStore.getState().setCache(data);
    expect(useFriendStore.getState().getCache()).toEqual(data);
    expect(useFriendStore.getState().getCacheEntry()?.data).toEqual(data);

    useFriendStore.getState().invalidate();
    expect(useFriendStore.getState().getCache()).toBeNull();
    expect(useFriendStore.getState().getCacheEntry()).toBeNull();
  });

  it("group store caches roles and groups", () => {
    useGroupStore.getState().setRoles({ g1: "owner" });
    useGroupStore.getState().setRole("g2", "member");
    expect(useGroupStore.getState().roles).toEqual({ g1: "owner", g2: "member" });

    useGroupStore.getState().setGroupCache("g1", { id: "g1", name: "Group" });
    expect(useGroupStore.getState().getGroupCache("g1")).toEqual({ id: "g1", name: "Group" });
    expect(useGroupStore.getState().getGroupCache("g2")).toBeNull();
    expect(useGroupStore.getState().getGroupCacheEntry("g1")?.data).toEqual({ id: "g1", name: "Group" });

    useGroupStore.getState().invalidateGroupCache("g1");
    expect(useGroupStore.getState().getGroupCache("g1")).toBeNull();
    expect(useGroupStore.getState().getGroupCacheEntry("g1")).toBeNull();

    useGroupStore.getState().setGroupListCache([{ id: "g1" }, { id: "g2" }] as any);
    expect(useGroupStore.getState().getGroupListCacheEntry()?.data).toEqual([{ id: "g1" }, { id: "g2" }]);

    useGroupStore.getState().invalidateGroupListCache();
    expect(useGroupStore.getState().getGroupListCacheEntry()).toBeNull();
  });
});
