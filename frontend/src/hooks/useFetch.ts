import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { getCache, fetchCached, isCacheFresh } from "@/lib/queryCache";

type UseFetchOptions = {
  cacheKey?: string;
  deps?: unknown[];
  /** Skip background refetch if cache age is under this (ms). Default 90s. */
  ttlMs?: number;
};

function useHasMounted() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  options: UseFetchOptions | unknown[] = {}
) {
  const { cacheKey, deps = [], ttlMs } = Array.isArray(options)
    ? { deps: options, cacheKey: undefined, ttlMs: undefined }
    : options;

  const cached = cacheKey ? getCache<T>(cacheKey) : undefined;
  const [data, setData] = useState<T | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mounted = useHasMounted();

  const refetch = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      const hasData = cacheKey ? getCache<T>(cacheKey) !== undefined : data !== null;
      const skipNetwork =
        cacheKey &&
        !opts?.force &&
        isCacheFresh(cacheKey, ttlMs) &&
        getCache<T>(cacheKey) !== undefined;

      if (skipNetwork) {
        const fresh = getCache<T>(cacheKey)!;
        setData(fresh);
        setLoading(false);
        return fresh;
      }

      if (!opts?.silent && !hasData) {
        setLoading(true);
        setError(null);
      }

      try {
        const result = cacheKey
          ? await fetchCached(cacheKey, () => fetcherRef.current(), {
              ttlMs,
              force: opts?.force,
            })
          : await fetcherRef.current();

        if (mounted.current) {
          setData(result);
          setError(null);
        }
        return result;
      } catch (e) {
        if (mounted.current && (!opts?.silent || !hasData)) {
          setError(e instanceof Error ? e.message : "Failed to load data");
        }
        throw e;
      } finally {
        if (mounted.current && (!opts?.silent || !hasData)) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, ttlMs, ...deps]
  );

  useEffect(() => {
    void refetch({ silent: cached !== undefined });
  }, [refetch]);

  return { data, loading, error, refetch };
}

/** True when the browser tab is visible (pause polling when hidden). */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      document.addEventListener("visibilitychange", onStoreChange);
      return () => document.removeEventListener("visibilitychange", onStoreChange);
    },
    () => document.visibilityState === "visible",
    () => true
  );
}
