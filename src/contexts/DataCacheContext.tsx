import { DataCacheContext, type CacheData } from "@/hooks/use-data-cache";
import { useState, type ReactNode } from "react";

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<CacheData>({});

  const invalidate = (key: string) => {
    setCache((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <DataCacheContext.Provider value={{ cache, setCache, invalidate }}>
      {children}
    </DataCacheContext.Provider>
  );
}
