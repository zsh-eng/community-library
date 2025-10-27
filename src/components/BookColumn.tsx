import { generateBookSlug } from "@/lib/utils";
import { useState } from "react";
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
  speed: number; // duration multiplier (higher = slower), best to have 30-60 seconds per cycle
  startDirection: "up" | "down";
}

const BOOK_WIDTH = 300;

export function BookColumn({ books, speed, startDirection }: BookColumnProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="h-full overflow-visible relative"
      style={{
        width: `${BOOK_WIDTH + 48}px`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style>{`
        @keyframes scroll-up {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes scroll-down {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <div
        className="space-y-6 py-8"
        style={{
          animation: `scroll-${startDirection} ${speed}s linear infinite`,
          animationPlayState: isHovered ? "paused" : "running",
        }}
      >
        {/* Render books twice for seamless loop */}
        {[...books, ...books].map((book, index) => (
          <Link
            key={`${book.id}-${index}`}
            to={`/book/${generateBookSlug(book.title, book.id)}`}
            className="group cursor-pointer block"
            style={{
              width: `${BOOK_WIDTH}px`,
            }}
          >
            <div className="space-y-3">
              {/* Book Cover */}
              <div
                className="relative bg-muted shadow-lg rounded-sm transition-all duration-150 group-hover:shadow-xl overflow-visible"
                style={{
                  transformOrigin: "center center",
                  willChange: "transform",
                }}
              >
                <div className="group-hover:scale-105 transition-transform duration-150">
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
