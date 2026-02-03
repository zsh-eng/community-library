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
  const shuffleSeed = 1337;

  const createSeededRandom = (seed: number) => {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const shuffledBooks = useMemo(() => {
    if (!books || books.length === 0) return [];

    const shuffled = books.slice();
    const rng = createSeededRandom(shuffleSeed);

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [books, shuffleSeed]);

  // Partition into 20 columns of 7 books each
  // 7 is enough for the user not to realise the number of books in a column
  // 20 columns is wide enough
  // We don't want to render too many for performance reasons
  // TODO: randomise partition
  const columns = useMemo(() => {
    if (!shuffledBooks || shuffledBooks.length === 0) return [];

    const baseSize = 7;
    const slicedBooks = shuffledBooks.slice(0, baseSize * 20);

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
    const rng = createSeededRandom(shuffleSeed + columns.length);

    return Array.from({ length: columns.length }).map((_, index) => ({
      cycleSpeedInSeconds: rng() * 20 + 40,
      startDirection: index % 2 === 0 ? ("down" as const) : ("up" as const), // Alternate starting directions
    }));
  }, [columns.length]);

  const numColumns = columns.length;

  useEffect(() => {
    if (columnContainersRef.current) {
      const scrollWidth = columnContainersRef.current.scrollWidth;
      const clientWidth = columnContainersRef.current.clientWidth;
      columnContainersRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;

      const scrollHeight = columnContainersRef.current.scrollHeight;
      const clientHeight = columnContainersRef.current.clientHeight;
      columnContainersRef.current.scrollTop = (scrollHeight - clientHeight) / 2;
    }
  }, [columns.length]);

  return (
    <div
      className="w-full h-[200vh] overflow-x-auto overflow-y-hidden book-columns-container"
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
