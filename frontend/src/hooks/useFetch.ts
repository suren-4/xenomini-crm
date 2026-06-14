import { useState, useEffect, useCallback, useRef } from "react";

export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (e) {
      if (!options?.silent) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
