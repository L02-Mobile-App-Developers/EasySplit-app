import { create } from "zustand";

type FriendCacheEntry = {
  friends: any[];
  requests: any[];
};

interface FriendStore {
  cache: { data: FriendCacheEntry; ts: number } | null;
  setCache: (data: FriendCacheEntry) => void;
  getCache: () => FriendCacheEntry | null;
  getCacheEntry: () => { data: FriendCacheEntry; ts: number } | null;
  invalidate: () => void;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
  cache: null,
  setCache(data) {
    set({ cache: { data, ts: Date.now() } });
  },
  getCache() {
    return get().cache?.data ?? null;
  },
  getCacheEntry() {
    return get().cache;
  },
  invalidate() {
    set({ cache: null });
  },
}));

export default {};
