import { useState, useEffect, useCallback, useRef } from "react";
import { getCache, setCache } from "@/lib/queryCache";

type UseFetchOptions = {
  cacheKey?: string;
  deps?: unknown[];
};

export function useFetch<T>(
  fetcher: () => Promise<T>,
  options: UseFetchOptions | unknown[] = {}
) {
  const { cacheKey, deps = [] } = Array.isArray(options)
    ? { deps: options, cacheKey: undefined }
    : options;

  const initialCached = cacheKey ? getCache<T>(cacheKey) : undefined;
  const hadCacheOnMount = useRef(initialCached !== undefined);

  const [data, setData] = useState<T | null>(initialCached ?? null);
  const [loading, setLoading] = useState(initialCached === undefined);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(
    async (opts?: { silent?: boolean }) => {
      const hasData = cacheKey ? getCache<T>(cacheKey) !== undefined : data !== null;
      if (!opts?.silent && !hasData) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await fetcherRef.current();
        setData(result);
        if (cacheKey) setCache(cacheKey, result);
      } catch (e) {
        if (!opts?.silent || !hasData) {
          setError(e instanceof Error ? e.message : "Failed to load data");
        }
      } finally {
        if (!opts?.silent || !hasData) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, ...deps]
  );

  useEffect(() => {
    refetch(hadCacheOnMount.current ? { silent: true } : undefined);
  }, [refetch]);

  return { data, loading, error, refetch };
}
