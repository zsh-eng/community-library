import { hc } from "hono/client";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { AppType } from "../../worker/index";
import { BookDetails, type BookDetail } from "./BookDetails";
import { Drawer, DrawerContent } from "./ui/drawer";

const client = hc<AppType>(import.meta.env.BASE_URL);

export function BookDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bookId = searchParams.get("book");
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = !!bookId;

  useEffect(() => {
    const fetchBook = async () => {
      if (!bookId) return;

      try {
        setLoading(true);
        setError(null);
        const res = await client.api.books[":id"].$get({
          param: { id: bookId },
        });

        if (!res.ok) {
          setError("Book not found");
          return;
        }

        const data = await res.json();
        setBook(data.book);
      } catch (error) {
        console.error("Failed to fetch book:", error);
        setError("Failed to load book details");
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchBook();
    }
  }, [bookId]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      searchParams.delete("book");
      setSearchParams(searchParams);
      setBook(null);
      setError(null);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="overflow-y-auto flex-1 pb-12 pt-4">
          {error && (
            <div className="px-4 py-8">
              <p className="text-lg text-red-600">{error}</p>
            </div>
          )}

          {book && !loading && !error && <BookDetails book={book} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
