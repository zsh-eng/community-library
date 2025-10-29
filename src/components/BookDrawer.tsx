import { useDataCache } from "@/hooks/use-data-cache";
import type { BookDetail } from "@/types";
import { hc } from "hono/client";
import { useSearchParams } from "react-router";
import type { AppType } from "../../worker/index";
import { BookDetails } from "./BookDetails";
import { Drawer, DrawerContent } from "./ui/drawer";

const client = hc<AppType>(import.meta.env.BASE_URL);

export function BookDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bookId = searchParams.get("book");

  const {
    data: book,
    loading,
    error,
  } = useDataCache<BookDetail>(
    bookId ? `book-${bookId}` : null,
    async () => {
      if (!bookId) throw new Error("No book ID provided");

      const res = await client.api.books[":id"].$get({
        param: { id: bookId },
      });

      if (!res.ok) {
        throw new Error("Book not found");
      }

      const data = await res.json();
      return data.book;
    },
    { enabled: !!bookId },
  );

  const isOpen = !!bookId;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      searchParams.delete("book");
      setSearchParams(searchParams);
    }
  };

  return (
    // Unfortunately we cannot select the text in the book details
    // because we want to preserve the modal behaviour
    // If we add modal=false, then the user cannot just tap to close the drawer
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="overflow-y-auto flex-1 pb-12">
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
