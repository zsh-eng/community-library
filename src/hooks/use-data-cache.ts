import { createContext, useContext, useEffect, useState } from "react";

export interface CacheData {
  [key: string]: unknown;
}

interface DataCacheContextType {
  cache: CacheData;
  setCache: React.Dispatch<React.SetStateAction<CacheData>>;
  invalidate: (key: string) => void;
}

export const DataCacheContext = createContext<DataCacheContextType | null>(
  null,
);

export function useDataCache<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: { enabled?: boolean } = {},
): {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const context = useContext(DataCacheContext);

  if (!context) {
    throw new Error("useDataCache must be used within a DataCacheProvider");
  }

  const { cache, setCache, invalidate } = context;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);

  const enabled = options.enabled !== false;
  const data = key ? (cache[key] as T | undefined) : undefined;

  useEffect(() => {
    if (!key || !enabled) return;

    // If data is already cached, don't fetch
    if (cache[key]) {
      setLoading(false);
      return;
    }

    // Mark that we should fetch
    if (!shouldFetch) {
      setShouldFetch(true);
    }
  }, [key, enabled, cache, shouldFetch]);

  useEffect(() => {
    if (!key || !enabled || !shouldFetch) return;

    const fetchData = async () => {
      // Double-check cache in case another component fetched it
      if (cache[key]) {
        setShouldFetch(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        setCache((prev) => ({ ...prev, [key]: result }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
        setShouldFetch(false);
      }
    };

    fetchData();
  }, [key, enabled, shouldFetch, cache, fetcher, setCache]);

  const refetch = () => {
    if (key) {
      invalidate(key);
      setShouldFetch(true);
    }
  };

  return { data, loading, error, refetch };
}
