import { create } from "zustand";

interface GroupStore {
  roles: Record<string, string | undefined>;
  setRoles: (map: Record<string, string | undefined>) => void;
  setRole: (groupId: string, role?: string) => void;
  // simple cache for group detail to avoid refetch on tab switch
  groupCache: Record<
    string,
    {
      data: any;
      ts: number;
    }
  >;
  setGroupCache: (groupId: string, data: any) => void;
  getGroupCache: (groupId: string) => any | null;
  getGroupCacheEntry: (groupId: string) => { data: any; ts: number } | null;
  invalidateGroupCache: (groupId: string) => void;
  groupListCache: { data: any[]; ts: number } | null;
  setGroupListCache: (data: any[]) => void;
  getGroupListCacheEntry: () => { data: any[]; ts: number } | null;
  invalidateGroupListCache: () => void;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  roles: {},
  groupCache: {},
  groupListCache: null,
  setRoles(map) {
    set({ roles: { ...map } });
  },
  setRole(groupId, role) {
    set((s) => ({ roles: { ...s.roles, [groupId]: role } }));
  },
  setGroupCache(groupId, data) {
    set((s) => ({ groupCache: { ...s.groupCache, [groupId]: { data, ts: Date.now() } } }));
  },
  getGroupCache(groupId) {
    const entry = get().groupCache[groupId];
    if (!entry) return null;
    return entry.data;
  },
  getGroupCacheEntry(groupId) {
    return get().groupCache[groupId] ?? null;
  },
  invalidateGroupCache(groupId) {
    set((s) => {
      const c = { ...s.groupCache };
      delete c[groupId];
      return { groupCache: c };
    });
  },
  setGroupListCache(data) {
    set({ groupListCache: { data, ts: Date.now() } });
  },
  getGroupListCacheEntry() {
    return get().groupListCache;
  },
  invalidateGroupListCache() {
    set({ groupListCache: null });
  },
}));

export default {};
