import { client } from "@/lib/api-client";
import type { BookCopy, BookDetail } from "@/types";
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
      book: BookDetail;
      copy: BookCopy;
    } | null> => {
      if (!qrCodeId) {
        return null;
      }

      // First, get all books to find which one has this QR code
      const booksRes = await client.api.books.$get();
      if (!booksRes.ok) {
        throw new Error("Failed to fetch books");
      }

      const { books } = await booksRes.json();

      // For each book, we need to fetch the full details to get copies
      // This is not optimal but works for the current scale
      for (const book of books) {
        const detailRes = await client.api.books[":id"].$get({
          param: { id: String(book.id) },
        });

        if (!detailRes.ok) continue;

        const { book: bookDetail } = (await detailRes.json()) as {
          book: BookDetail;
        };
        const matchingCopy = bookDetail.bookCopies.find(
          (copy) => copy.qrCodeId === qrCodeId,
        );

        if (matchingCopy) {
          return { book: bookDetail, copy: matchingCopy };
        }
      }

      return null;
    },
    enabled: qrCodeId !== null,
  });
}
