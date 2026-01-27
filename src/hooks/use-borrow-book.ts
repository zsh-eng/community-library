import { client } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { initData, useSignal } from "@telegram-apps/sdk-react";

export type BorrowResult = {
  success: boolean;
  loan?: {
    id: number;
    borrowedAt: string;
    dueDate: string;
  };
  book?: {
    title: string;
    author: string;
  };
  copyNumber?: number;
  error?: string;
};

/**
 * Hook to borrow a book via the Mini App API.
 * Uses Telegram initData for authentication.
 */
export function useBorrowBook() {
  const user = useSignal(initData.user);
  const initDataRaw = initData.raw();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (qrCodeId: string): Promise<BorrowResult> => {
      if (!initDataRaw) {
        throw new Error("Init data not available");
      }

      const res = await client.api.miniapp.books[":qrCodeId"].borrow.$post(
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
        throw new Error("error" in data ? data.error : "Failed to borrow book");
      }

      return data as BorrowResult;
    },
    onSuccess: () => {
      // Invalidate loans query to refresh the user's active loans
      queryClient.invalidateQueries({ queryKey: ["user-loans", user?.id] });
    },
  });
}
