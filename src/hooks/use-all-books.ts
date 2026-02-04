import { client } from "@/lib/api-client";
import type { Book } from "@/types";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch all books from the API.
 * Used by the admin books list view.
 */
export function useAllBooks() {
  return useQuery({
    queryKey: ["all-books"],
    queryFn: async (): Promise<Book[]> => {
      const res = await client.api.books.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch books");
      }
      const data = await res.json();
      return data.books;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
