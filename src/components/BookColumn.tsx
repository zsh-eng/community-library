import { generateBookSlug } from "@/lib/utils";
import { useState } from "react";
import { Link, useViewTransitionState } from "react-router";

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
  cycleSpeedInSeconds: number; // duration multiplier (higher = slower), best to have 30-60 seconds per cycle
  startDirection: "up" | "down";
}

function BookItem({ book }: { book: Book }) {
  const href = `/book/${generateBookSlug(book.title, book.id)}`;
  return (
    <Link
      to={href}
      className="group cursor-pointer block w-[var(--book-width)]"
    >
      <div className="space-y-3">
        <div className="relative bg-muted shadow-lg rounded-sm...">
          <div className="group-hover:scale-103 transition-transform duration-150">
            {book.imageUrl ? (
              <img
                loading="lazy"
                src={book.imageUrl}
                alt={book.title}
                className="w-full rounded-sm transition-all duration-150 h-auto"
              />
            ) : (
              <div className="w-full flex items-center justify-center bg-muted h-[400px]">
                <p className="text-xs text-muted-foreground text-center px-2">
                  No cover
                </p>
              </div>
            )}
          </div>
        </div>

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
  );
}

export function BookColumn({
  books,
  cycleSpeedInSeconds,
  startDirection,
}: BookColumnProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="h-full overflow-visible relative w-[var(--book-width)]"
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
          animation: `scroll-${startDirection} ${cycleSpeedInSeconds}s linear infinite`,
          animationPlayState: isHovered ? "paused" : "running",
        }}
      >
        {[...books].map((book, index) => (
          <BookItem key={`book-item-${book.id}-${index}`} book={book} />
        ))}
      </div>
    </div>
  );
}
