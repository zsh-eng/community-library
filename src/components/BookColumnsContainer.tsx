import { BookColumn } from "@/components/BookColumn";
import type { Book } from "@/types";
import { memo, useEffect, useMemo, useRef } from "react";

interface BookColumnsContainerProps {
  books: Book[];
}

// We need to memoise, or toggling the showLibrary will cause expensive re-renders here
// The lag is noticeable when you have to re-render this entire container
export const BookColumnsContainer = memo(function BookColumnsContainer({
  books,
}: BookColumnsContainerProps) {
  const columnContainersRef = useRef<HTMLDivElement>(null);
  console.log("re-rendering book columns container");

  // Partition into 20 columns of 7 books each
  // 7 is enough for the user not to realise the number of books in a column
  // 20 columns is wide enough
  // We don't want to render too many for performance reasons
  const columns = useMemo(() => {
    if (!books || books.length === 0) return [];

    const baseSize = 7;
    const slicedBooks = books.slice(0, baseSize * 20);

    const numColumns = Math.ceil(slicedBooks.length / baseSize);
    const basePerColumn = Math.floor(slicedBooks.length / numColumns);
    const numLarger = slicedBooks.length % numColumns;

    const cols: Book[][] = [];
    let currentIndex = 0;

    for (let i = 0; i < numColumns; i++) {
      const columnSize = basePerColumn + (i < numLarger ? 1 : 0);
      cols.push(slicedBooks.slice(currentIndex, currentIndex + columnSize));
      currentIndex += columnSize;
    }

    return cols;
  }, [books]);

  // Generate random speeds and directions for each column
  const columnConfigs = useMemo(() => {
    return Array.from({ length: columns.length }).map((_, index) => ({
      cycleSpeedInSeconds: Math.random() * 20 + 40,
      startDirection: index % 2 === 0 ? ("down" as const) : ("up" as const), // Alternate starting directions
    }));
  }, [columns.length]);

  const numColumns = columns.length;

  useEffect(() => {
    if (columnContainersRef.current) {
      const scrollWidth = columnContainersRef.current.scrollWidth;
      const clientWidth = columnContainersRef.current.clientWidth;
      columnContainersRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
    }
  }, [columns.length]);

  return (
    <div
      className="w-full h-full overflow-x-auto overflow-y-hidden book-columns-container"
      ref={columnContainersRef}
    >
      <style>{`
        .book-columns-container {
          --book-width: 160px;
          --column-gap: 24px;
        }
        @media (min-width: 1024px) {
          .book-columns-container {
            --book-width: 300px;
            --column-gap: 32px;
          }
        }
      `}</style>

      {/* Columns container */}
      <div
        className="h-full flex justify-center gap-6 lg:gap-8 px-8"
        style={{
          width: `calc((var(--book-width) + var(--column-gap)) * ${numColumns} + 64px)`,
        }}
      >
        {columns.map((columnBooks, columnIndex) => (
          <BookColumn
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
