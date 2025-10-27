import { generateBookSlug } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  imageUrl: string | null;
  createdAt: string;
}

interface BookColumnProps {
  books: Book[];
  speed: number; // pixels per frame
  startDirection: "up" | "down";
}

const BOOK_WIDTH = 300;

export function BookColumn({ books, speed, startDirection }: BookColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [direction, setDirection] = useState<"up" | "down">(startDirection);
  const [isHovered, setIsHovered] = useState(false);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const columnEl = columnRef.current;
    const contentEl = contentRef.current;

    if (!columnEl || !contentEl) return;

    // Set initial scroll position based on start direction
    if (startDirection === "down") {
      columnEl.scrollTop = 0;
    } else {
      columnEl.scrollTop = contentEl.scrollHeight - columnEl.clientHeight;
    }

    const animate = () => {
      if (!columnEl || !contentEl) return;

      const maxScroll = contentEl.scrollHeight - columnEl.clientHeight;
      const currentScroll = columnEl.scrollTop;

      // Apply speed (slower when hovered)
      const actualSpeed = isHovered ? speed * 0.2 : speed;

      let newScroll = currentScroll;

      if (direction === "down") {
        newScroll = currentScroll + actualSpeed;

        // Check if we've reached the bottom
        if (newScroll >= maxScroll) {
          newScroll = maxScroll;
          setDirection("up");
        }
      } else {
        newScroll = currentScroll - actualSpeed;

        // Check if we've reached the top
        if (newScroll <= 0) {
          newScroll = 0;
          setDirection("down");
        }
      }

      columnEl.scrollTop = newScroll;
      setScrollPosition(newScroll);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [direction, speed, isHovered, startDirection]);

  return (
    <div
      ref={columnRef}
      className="h-full overflow-y-auto scrollbar-hide px-6"
      style={{
        width: `${BOOK_WIDTH + 48}px`, // Add padding width (24px * 2)
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        pointerEvents: "none", // Disable manual scrolling
        overflowAnchor: "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div ref={contentRef} className="space-y-6 py-8">
        {books.map((book) => (
          <Link
            key={book.id}
            to={`/book/${generateBookSlug(book.title, book.id)}`}
            className="group cursor-pointer block"
            style={{
              width: `${BOOK_WIDTH}px`,
              pointerEvents: "auto", // Re-enable pointer events for links
            }}
          >
            <div className="space-y-3">
              {/* Book Cover */}
              <div
                className="relative bg-muted shadow-lg rounded-sm transition-all duration-150 group-hover:shadow-xl overflow-visible"
                style={{
                  transformOrigin: "center center",
                }}
              >
                <div className="group-hover:border transition-transform duration-150">
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
    </div>
  );
}
