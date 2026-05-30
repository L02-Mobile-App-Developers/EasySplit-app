import { create } from "zustand";

type HistoryCacheEntry = {
  groups: any[];
  transactions: any[];
  activeGroup?: any | null;
};

interface HistoryStore {
  cache: { data: HistoryCacheEntry; ts: number } | null;
  setCache: (data: HistoryCacheEntry) => void;
  getCache: () => HistoryCacheEntry | null;
  getCacheEntry: () => { data: HistoryCacheEntry; ts: number } | null;
  invalidate: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
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
