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

  const enabled = options.enabled !== false;
  const data = key ? (cache[key] as T | undefined) : undefined;
  const isCached = key ? key in cache : false;

  useEffect(() => {
    if (!key || !enabled || isCached) return;

    let cancelled = false;

    const fetchData = async () => {
      // Double-check cache in case another component fetched it
      if (cache[key]) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        if (!cancelled) {
          setCache((prev) => ({ ...prev, [key]: result }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
    // Intentionally omit fetcher and setCache from dependencies to prevent re-fetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, isCached]);

  const refetch = () => {
    if (key) {
      invalidate(key);
    }
  };

  return { data, loading, error, refetch };
}
