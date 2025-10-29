import { BookColumnsContainer } from "@/components/BookColumnsContainer";
import { LibraryGrid } from "@/components/LibraryGrid";
import { useDataCache } from "@/hooks/use-data-cache";
import type { Book } from "@/types";
import { hc } from "hono/client";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import type { AppType } from "../worker/index";

const client = hc<AppType>(import.meta.env.BASE_URL);

function Canvas() {
  const [showLibrary, setShowLibrary] = useState(false);

  const fetchBooks = useCallback(async () => {
    const res = await client.api.books.$get();
    if (!res.ok) {
      throw new Error("Failed to fetch books");
    }
    const data = await res.json();
    return data.books;
  }, []);

  const {
    data: books,
    loading,
    error,
  } = useDataCache<Book[]>("books", fetchBooks);

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="text-lg text-red-600">{error}</p>
      </div>
    );
  }

  if (loading) {
    // TODO: add a loading state?
    return null;
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Search Bar */}
        <div className="absolute top-4 lg:top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <button
            onClick={() => setShowLibrary(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-sm border border-border rounded-full shadow-lg hover:shadow-xl hover:scale-[101%] transition-all cursor-pointer group"
          >
            <Search className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            <span className="text-base text-muted-foreground group-hover:text-foreground transition-colors">
              Search for books...
            </span>
          </button>
        </div>

        {/* Horizontal scrolling container */}
        {books && <BookColumnsContainer books={books} />}
      </motion.div>

      {/* Library Overlay */}
      <AnimatePresence>
        {showLibrary && books && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-0 md:p-8 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLibrary(false)}
          >
            <motion.div
              className="md:rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full h-full lg:h-[85vh]"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <LibraryGrid books={books} setShowLibrary={setShowLibrary} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Canvas;
