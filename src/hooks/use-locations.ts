import { client } from "@/lib/api-client";
import type { Location } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { initData } from "@telegram-apps/sdk-react";

/**
 * Hook to fetch all locations from the Mini App API.
 * Uses Telegram initData for authentication.
 */
export function useLocations() {
  const initDataRaw = initData.raw();

  return useQuery({
    queryKey: ["locations"],
    queryFn: async (): Promise<Location[]> => {
      if (!initDataRaw) {
        throw new Error("Init data not available");
      }

      const res = await client.api.miniapp.locations.$get(
        {},
        {
          headers: {
            Authorization: `tma ${initDataRaw}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch locations");
      }

      const data = await res.json();
      return data.locations as Location[];
    },
    enabled: !!initDataRaw,
  });
}
