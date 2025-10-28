import { DataCacheContext, type CacheData } from "@/hooks/use-data-cache";
import { useCallback, useMemo, useState, type ReactNode } from "react";

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<CacheData>({});

  const invalidate = useCallback((key: string) => {
    setCache((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ cache, setCache, invalidate }),
    [cache, invalidate],
  );

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}
