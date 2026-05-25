import { create } from "zustand";

type HomeCacheEntry = {
  groups: any[];
  recentActivities: any[];
  netBalance: number;
  owedBalance: number;
  receivableBalance: number;
};

interface HomeStore {
  cache?: {
    data: HomeCacheEntry;
    ts: number;
  } | null;
  setCache: (data: HomeCacheEntry) => void;
  getCache: () => HomeCacheEntry | null;
  getCacheEntry: () => { data: HomeCacheEntry; ts: number } | null;
  invalidate: () => void;
}

export const useHomeStore = create<HomeStore>((set, get) => ({
  cache: null,
  setCache(data) {
    set({ cache: { data, ts: Date.now() } });
  },
  getCache() {
    return get().cache?.data ?? null;
  },
  getCacheEntry() {
    return get().cache ?? null;
  },
  invalidate() {
    set({ cache: null });
  },
}));

export default {};
