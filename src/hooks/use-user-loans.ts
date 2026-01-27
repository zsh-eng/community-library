import { client } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { initData, useSignal } from "@telegram-apps/sdk-react";

export type ActiveLoan = {
  qrCodeId: string;
  title: string;
  author: string;
  copyNumber: number;
  borrowedAt: string;
  dueDate: string;
};

/**
 * Hook to fetch authenticated user's active loans from the Mini App API.
 * Uses Telegram initData for authentication.
 */
export function useUserLoans() {
  const user = useSignal(initData.user);
  const initDataRaw = initData.raw();

  return useQuery({
    queryKey: ["user-loans", user?.id],
    queryFn: async (): Promise<ActiveLoan[]> => {
      if (!initDataRaw) {
        throw new Error("Init data not available");
      }

      const res = await client.api.miniapp.loans.$get(
        {},
        {
          headers: {
            Authorization: `tma ${initDataRaw}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch loans");
      }

      const data = await res.json();
      return data.loans as ActiveLoan[];
    },
    enabled: !!user?.id && !!initDataRaw,
  });
}
