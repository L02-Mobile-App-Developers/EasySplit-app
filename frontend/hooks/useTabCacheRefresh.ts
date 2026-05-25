import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { AppState } from "react-native";

type CacheEntry<T> = { data: T; ts: number } | null;

type UseTabCacheRefreshOptions<T> = {
  getCacheEntry: () => CacheEntry<T>;
  applyCache: (data: T) => void;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  ttlMs?: number;
};

export function useTabCacheRefresh<T>({
  getCacheEntry,
  applyCache,
  refresh,
  ttlMs = 30_000,
}: UseTabCacheRefreshOptions<T>) {
  const refreshIfNeeded = useCallback(
    async (silent = false) => {
      const entry = getCacheEntry();

      if (entry?.data) {
        applyCache(entry.data);
      }

      const isStale = !entry || Date.now() - entry.ts > ttlMs;
      if (isStale) {
        await refresh({ silent: silent || Boolean(entry?.data) });
      }
    },
    [applyCache, getCacheEntry, refresh, ttlMs],
  );

  useFocusEffect(
    useCallback(() => {
      refreshIfNeeded(false).catch(() => {});

      const subscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          refreshIfNeeded(true).catch(() => {});
        }
      });

      return () => subscription.remove();
    }, [refreshIfNeeded]),
  );
}
