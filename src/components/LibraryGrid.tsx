import { BookDrawer } from "@/components/BookDrawer";
import { generateBookSlug } from "@/lib/utils";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  imageUrl: string | null;
  createdAt: string;
}

interface LibraryGridProps {
  books: Book[];
  loading?: boolean;
  searchQuery: string;
  isOverlay?: boolean;
}

export function LibraryGrid({
  books,
  loading = false,
  searchQuery,
  isOverlay = false,
}: LibraryGridProps) {
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [, setSearchParams] = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!books) {
      setFilteredBooks([]);
      return;
    }

    if (searchQuery.trim() === "") {
      setFilteredBooks(books);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query),
    );
    setFilteredBooks(filtered);
  }, [searchQuery, books]);

  const handleBookClick = (bookId: number, e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
      setSearchParams({ book: bookId.toString() });
    }
    // Or else just let the link handle
  };

  return (
    <>
      <BookDrawer />
      <div
        className={`${isOverlay ? "bg-background/80 backdrop-blur-md" : "bg-background"}`}
      >
        <div className="max-w-7xl mx-auto px-8">
          {/* Grid Layout */}
          <div className={isOverlay ? "pt-12 pb-24" : "pt-8 pb-24"}>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5  gap-6">
                {/* Skeleton loading placeholders */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-3 animate-pulse">
                    <div className="aspect-[2/3] bg-muted rounded-sm" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground">
                  {searchQuery
                    ? "No books found matching your search"
                    : "No books in library"}
                </p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ease: "easeOut",
                  duration: 0.4,
                }}
              >
                {filteredBooks.map((book) => (
                  <div key={book.id} className="relative isolate">
                    <Link
                      to={`/book/${generateBookSlug(book.title, book.id)}`}
                      className="group cursor-pointer block"
                      onClick={(e) => handleBookClick(book.id, e)}
                    >
                      <div className="space-y-3">
                        {/* Book Cover */}
                        <div className="aspect-[2/3] relative bg-muted shadow-lg rounded-sm transition-all duration-150 group-hover:shadow-xl group-hover:z-10">
                          {book.imageUrl ? (
                            <img
                              loading="lazy"
                              src={book.imageUrl}
                              alt={book.title}
                              className="w-full h-full object-cover group-hover:scale-[102%] rounded-sm transition-all duration-150"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
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
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
