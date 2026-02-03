import { client } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { initData } from "@telegram-apps/sdk-react";

export type AddCopyResult = {
  success: boolean;
  copy?: {
    qrCodeId: string;
    copyNumber: number;
  };
  error?: string;
};

type AddCopyParams = {
  bookId: number;
  qrCodeId: string;
  locationId: number;
};

/**
 * Hook to add a new book copy via the Mini App API (admin only).
 * Uses Telegram initData for authentication.
 */
export function useAddBookCopy() {
  const initDataRaw = initData.raw();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      qrCodeId,
      locationId,
    }: AddCopyParams): Promise<AddCopyResult> => {
      if (!initDataRaw) {
        throw new Error("Init data not available");
      }

      const res = await client.api.miniapp.books[":bookId"].copies.$post(
        {
          param: { bookId: String(bookId) },
          json: { qrCodeId, locationId },
        },
        {
          headers: {
            Authorization: `tma ${initDataRaw}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error("error" in data ? data.error : "Failed to add copy");
      }

      return data as AddCopyResult;
    },
    onSuccess: (_, variables) => {
      // Invalidate book query to refresh the copies list
      queryClient.invalidateQueries({ queryKey: ["book", variables.bookId] });
    },
  });
}
