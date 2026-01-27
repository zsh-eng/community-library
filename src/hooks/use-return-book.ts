import { client } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { initData, useSignal } from "@telegram-apps/sdk-react";

export type ReturnResult = {
  success: boolean;
  book?: {
    title: string;
    author: string;
  };
  borrowedAt?: string;
  returnedAt?: string;
  error?: string;
};

/**
 * Hook to return a book via the Mini App API.
 * Uses Telegram initData for authentication.
 */
export function useReturnBook() {
  const user = useSignal(initData.user);
  const initDataRaw = initData.raw();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (qrCodeId: string): Promise<ReturnResult> => {
      if (!initDataRaw) {
        throw new Error("Init data not available");
      }

      const res = await client.api.miniapp.books[":qrCodeId"].return.$post(
        {
          param: { qrCodeId },
        },
        {
          headers: {
            Authorization: `tma ${initDataRaw}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error("error" in data ? data.error : "Failed to return book");
      }

      return data as ReturnResult;
    },
    onSuccess: () => {
      // Invalidate loans query to refresh the user's active loans
      queryClient.invalidateQueries({ queryKey: ["user-loans", user?.id] });
    },
  });
}
