import { client } from "@/lib/api-client";
import type { Book, BookCopy, BookDetail } from "@/types";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch a book's details by ID.
 * Returns the full BookDetail including all copies.
 */
export function useBookDetail(bookId: number | null) {
  return useQuery({
    queryKey: ["book", bookId],
    queryFn: async (): Promise<BookDetail> => {
      if (bookId === null) {
        throw new Error("Book ID is required");
      }

      const res = await client.api.books[":id"].$get({
        param: { id: String(bookId) },
      });

      if (!res.ok) {
        throw new Error("Book not found");
      }

      const data = await res.json();
      return data.book as BookDetail;
    },
    enabled: bookId !== null,
  });
}

/**
 * Look up a book copy by QR code ID.
 * This fetches all books and searches for the matching copy.
 *
 * Returns the book detail and the matching copy, or null if not found.
 */
export function useBookCopyLookup(qrCodeId: string | null) {
  return useQuery({
    queryKey: ["book-copy-lookup", qrCodeId],
    queryFn: async (): Promise<{
      book: Book;
      copy: BookCopy;
    } | null> => {
      if (!qrCodeId) {
        return null;
      }

      // First, get all books to find which one has this QR code
      const bookCopyRes = await client.api.copies[":qrCodeId"].$get({
        param: { qrCodeId },
      });

      if (!bookCopyRes.ok) {
        throw new Error("Failed to fetch book copies");
      }

      const data = await bookCopyRes.json();
      return data;
    },
    enabled: qrCodeId !== null,
  });
}
