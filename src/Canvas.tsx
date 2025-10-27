import { useDataCache } from "@/hooks/use-data-cache";
import { hc } from "hono/client";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { AppType } from "../worker/index";
import { BookColumn } from "./components/BookColumn";
import { LibraryGrid } from "./components/LibraryGrid";
import { useIsMobile } from "./hooks/use-mobile";

const client = hc<AppType>(import.meta.env.BASE_URL);

interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  imageUrl: string | null;
  createdAt: string;
}

interface BookColumnsContainerProps {
  books: Book[];
}

// We need to memoise, or toggling the showLibrary will cause expensive re-renders here
// The lag is noticeable when you have to re-render this entire container
const BookColumnsContainer = memo(function BookColumnsContainer({
  books,
}: BookColumnsContainerProps) {
  const columnContainersRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  console.log("re-rendering book columns container");

  // Partition books into columns with 7-10 books each
  const columns = useMemo(() => {
    if (!books || books.length === 0) return [];

    const baseSize = 10;
    const numColumns = Math.ceil(books.length / baseSize);
    const basePerColumn = Math.floor(books.length / numColumns);
    const numLarger = books.length % numColumns;

    const cols: Book[][] = [];
    let currentIndex = 0;

    for (let i = 0; i < numColumns; i++) {
      const columnSize = basePerColumn + (i < numLarger ? 1 : 0);
      cols.push(books.slice(currentIndex, currentIndex + columnSize));
      currentIndex += columnSize;
    }

    return cols;
  }, [books]);

  // Generate random speeds and directions for each column
  const columnConfigs = useMemo(() => {
    return Array.from({ length: columns.length }).map((_, index) => ({
      cycleSpeedInSeconds: Math.random() * 30 + 50,
      startDirection: index % 2 === 0 ? ("down" as const) : ("up" as const), // Alternate starting directions
    }));
  }, [columns.length]);

  const bookWidth = isMobile ? 160 : 300;
  const columnGap = isMobile ? 24 : 32;
  const columnWidth = bookWidth + columnGap; // Book width + gap between columns
  const columnsContainerWidth = columnWidth * columns.length + 60; // Add some spacing on the left and right

  useEffect(() => {
    if (columnContainersRef.current) {
      const scrollWidth = columnContainersRef.current.scrollWidth;
      const clientWidth = columnContainersRef.current.clientWidth;
      columnContainersRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
    }
  }, [columns.length]);

  return (
    <div
      className="w-full h-full overflow-x-auto overflow-y-hidden"
      ref={columnContainersRef}
    >
      {/* Columns container */}
      <div
        className="h-full flex justify-center gap-6 lg:gap-8 px-8"
        style={{
          width: `${columnsContainerWidth}px`,
        }}
      >
        {columns.map((columnBooks, columnIndex) => (
          <BookColumn
            bookWidth={bookWidth}
            key={columnIndex}
            books={columnBooks}
            cycleSpeedInSeconds={columnConfigs[columnIndex].cycleSpeedInSeconds}
            startDirection={columnConfigs[columnIndex].startDirection}
          />
        ))}
      </div>
    </div>
  );
});

function Canvas() {
  const {
    data: books,
    loading,
    error,
  } = useDataCache<Book[]>("books", async () => {
    const res = await client.api.books.$get();
    if (!res.ok) {
      throw new Error("Failed to fetch books");
    }
    const data = await res.json();
    return data.books;
  });
  const [showLibrary, setShowLibrary] = useState(false);

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

  console.log("render");

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Search Bar */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <button
            onClick={() => setShowLibrary(true)}
            className="w-full flex items-center gap-3 px-6 py-3 bg-background/80 backdrop-blur-sm border border-border rounded-full shadow-lg hover:shadow-xl hover:scale-[101%] transition-all cursor-pointer group"
          >
            <Search className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Search library
            </span>
          </button>
        </div>

        {/* Horizontal scrolling container */}
        <BookColumnsContainer books={books || []} />
      </motion.div>

      {/* Library Overlay */}
      <AnimatePresence>
        {showLibrary && books && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-8 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLibrary(false)}
          >
            <motion.div
              className="rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full h-[85vh]"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <LibraryGrid books={books} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Canvas;
