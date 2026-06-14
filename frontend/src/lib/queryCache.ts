const DEFAULT_TTL_MS = 90_000;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function getCache<T>(key: string): T | undefined {
  return cache.get(key)?.data as T | undefined;
}

export function isCacheFresh(key: string, ttlMs = DEFAULT_TTL_MS): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < ttlMs;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    cache.clear();
    inFlight.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`)) {
      cache.delete(key);
      inFlight.delete(key);
    }
  }
}

/** Dedupe concurrent fetches; skip network if cache is still fresh. */
export async function fetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; force?: boolean }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (!options?.force && isCacheFresh(key, ttlMs)) {
    return getCache<T>(key)!;
  }

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      setCache(key, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}
