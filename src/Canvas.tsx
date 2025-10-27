import { useDataCache } from "@/hooks/use-data-cache";
import { generateBookSlug } from "@/lib/utils";
import { hc } from "hono/client";
import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import type { AppType } from "../worker/index";

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

  const viewportRef = useRef<HTMLDivElement>(null);

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
  // Calculate canvas dimensions
  const canvasDimensions = useMemo(() => {
    if (columns.length === 0) {
      return { width: 2000, height: 2000 };
    }

    const BOOK_WIDTH = 300;
    const COLUMN_GAP = 48;
    const BOOK_GAP = 24;
    const BOOK_INFO_HEIGHT = 80; // Approximate height for title + author
    const PADDING = 200;

    // Estimate book heights (we'll use an average)
    const ESTIMATED_BOOK_HEIGHT = 450;

    // Calculate total width needed
    const totalWidth =
      columns.length * BOOK_WIDTH +
      (columns.length - 1) * COLUMN_GAP +
      PADDING * 2;

    // Calculate max column height
    const maxBooksInColumn = Math.max(...columns.map((col) => col.length));
    const maxHeight =
      maxBooksInColumn * (ESTIMATED_BOOK_HEIGHT + BOOK_INFO_HEIGHT + BOOK_GAP);

    return {
      width: Math.max(totalWidth, 2000),
      height: Math.max(maxHeight, 2000),
    };
  }, [columns]);

  // Center the viewport on mount
  useEffect(() => {
    if (viewportRef.current && books && books.length > 0) {
      const viewport = viewportRef.current;
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
      viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
    }
  }, [books]);

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
  const COLUMN_GAP = 48;
  const BOOK_GAP = 24;
  const BOOK_INFO_HEIGHT = 80;
  const ESTIMATED_BOOK_HEIGHT = 450;

  return (
    <div className="fixed inset-0 bg-background">
      {/* Info panel */}
      <div className="fixed top-4 left-4 z-10 bg-black/80 text-white px-4 py-3 rounded-lg text-sm pointer-events-none">
        <div>Books: {books?.length || 0}</div>
        <div>Columns: {columns.length}</div>
        <div className="text-xs opacity-70 mt-1">Drag to pan</div>
      </div>

      {/* Back to Library link */}
      <Link
        to="/"
        className="fixed top-4 right-4 z-10 bg-black/80 text-white px-4 py-3 rounded-lg text-sm hover:bg-black/90 transition-colors"
      >
        ← Back to Library
      </Link>

      {/* Viewport */}
      <div
        ref={viewportRef}
        className="w-full h-full overflow-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`
          #canvas-viewport::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Canvas */}
        <div
          className="relative bg-background"
          style={{
            width: `${canvasDimensions.width}px`,
            height: `${canvasDimensions.height}px`,
          }}
        >
          {/* Columns container - centered in canvas */}
          <div
            className="absolute"
            style={{
              left: "2%",
              top: "52%",
            }}
          >
            {columns.map((columnBooks, columnIndex) => {
              const columnHeight =
                columnBooks.length *
                (ESTIMATED_BOOK_HEIGHT + BOOK_INFO_HEIGHT + BOOK_GAP);

              return (
                <div
                  key={columnIndex}
                  className="absolute"
                  style={{
                    left: `${columnIndex * (BOOK_WIDTH + COLUMN_GAP)}px`,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  {columnBooks.map((book) => (
                    <Link
                      key={book.id}
                      to={`/book/${generateBookSlug(book.title, book.id)}`}
                      className="group cursor-pointer block mb-6"
                      style={{
                        width: `${BOOK_WIDTH}px`,
                      }}
                    >
                      <div className="space-y-3">
                        {/* Book Cover */}
                        <div className="relative bg-muted shadow-lg rounded-sm transition-all duration-150 group-hover:shadow-xl group-hover:scale-105">
                          {book.imageUrl ? (
                            <img
                              loading="lazy"
                              src={book.imageUrl}
                              alt={book.title}
                              className="w-full rounded-sm transition-all duration-150"
                              style={{
                                width: `${BOOK_WIDTH}px`,
                                height: "auto",
                              }}
                            />
                          ) : (
                            <div
                              className="w-full flex items-center justify-center bg-muted"
                              style={{
                                width: `${BOOK_WIDTH}px`,
                                height: "400px",
                              }}
                            >
                              <p className="text-xs text-muted-foreground text-center px-2">
                                No cover
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Book Info */}
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors font-serif">
                            {book.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {book.author}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Canvas;
