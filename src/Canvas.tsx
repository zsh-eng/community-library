import { useDataCache } from "@/hooks/use-data-cache";
import { hc } from "hono/client";
import { useEffect, useMemo, useRef } from "react";
import type { AppType } from "../worker/index";
import { BookColumn } from "./components/BookColumn";

const client = hc<AppType>(import.meta.env.BASE_URL);

interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  imageUrl: string | null;
  createdAt: string;
}

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
      speed: Math.random() * 30 + 50,
      startDirection: index % 2 === 0 ? ("down" as const) : ("up" as const), // Alternate starting directions
    }));
  }, [columns.length]);

  const columnContainersRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (columnContainersRef.current) {
      const scrollWidth = columnContainersRef.current.scrollWidth;
      const clientWidth = columnContainersRef.current.clientWidth;
      columnContainersRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
    }
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="text-lg text-red-600">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Loading canvas...</p>
      </div>
    );
  }

  const BOOK_WIDTH = 300;
  const COLUMN_WIDTH = BOOK_WIDTH + 32; // Book width + gap between columns
  const COLUMNS_CONTAINER_WIDTH = COLUMN_WIDTH * columns.length + 80; // Add some spacing on the left and right

  return (
    <div className="fixed inset-0 bg-background">
      {/* Horizontal scrolling container */}
      <div
        className="w-full h-full overflow-x-auto overflow-y-hidden"
        ref={columnContainersRef}
        style={{
          scrollbarWidth: "thin",
        }}
      >
        {/* Columns container */}
        <div
          className="h-full flex justify-center gap-8 px-8"
          style={{
            width: `${COLUMNS_CONTAINER_WIDTH}px`,
          }}
        >
          {columns.map((columnBooks, columnIndex) => (
            <BookColumn
              key={columnIndex}
              books={columnBooks}
              speed={columnConfigs[columnIndex].speed}
              startDirection={columnConfigs[columnIndex].startDirection}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Canvas;
