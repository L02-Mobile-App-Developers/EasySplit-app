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
  invalidateGroupCache: (groupId: string) => void;
}

export const useGroupStore = create<GroupStore>((set) => ({
  roles: {},
  groupCache: {},
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
    const state = (useGroupStore.getState && useGroupStore.getState()) as any;
    const entry = state?.groupCache?.[groupId];
    if (!entry) return null;
    return entry.data;
  },
  getGroupCacheEntry(groupId) {
    const state = (useGroupStore.getState && useGroupStore.getState()) as any;
    const entry = state?.groupCache?.[groupId];
    if (!entry) return null;
    return entry;
  },
  invalidateGroupCache(groupId) {
    set((s) => {
      const c = { ...s.groupCache };
      delete c[groupId];
      return { groupCache: c };
    });
  },
}));

export default {};
