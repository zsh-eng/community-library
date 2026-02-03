import { client } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { initData, useSignal } from "@telegram-apps/sdk-react";

export type CurrentUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
};

/**
 * Hook to fetch current user info and admin status from the Mini App API.
 * Uses Telegram initData for authentication.
 */
export function useCurrentUser() {
  const user = useSignal(initData.user);
  const initDataRaw = initData.raw();

  return useQuery({
    queryKey: ["current-user", user?.id],
    queryFn: async (): Promise<{ user: CurrentUser; isAdmin: boolean }> => {
      if (!initDataRaw) {
        throw new Error("Init data not available");
      }

      const res = await client.api.miniapp.me.$get(
        {},
        {
          headers: {
            Authorization: `tma ${initDataRaw}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch user info");
      }

      const data = await res.json();
      return data as { user: CurrentUser; isAdmin: boolean };
    },
    enabled: !!user?.id && !!initDataRaw,
  });
}
