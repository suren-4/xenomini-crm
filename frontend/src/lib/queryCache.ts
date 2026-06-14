const cache = new Map<string, unknown>();

export function getCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, data);
}

export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`)) {
      cache.delete(key);
    }
  }
}
