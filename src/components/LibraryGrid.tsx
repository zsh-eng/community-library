import { BookDrawer } from "@/components/BookDrawer";
import { generateBookSlug } from "@/lib/utils";
import { Search } from "lucide-react";
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
}

export function LibraryGrid({ books }: LibraryGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
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
        className={
          "bg-background/80 backdrop-blur-md h-full w-full flex flex-col"
        }
      >
        {/* Search Bar */}
        <div className="flex-shrink-0 px-8 pt-8 pb-4">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for books..."
              className="w-full pl-12 pr-4 py-3 bg-background/60 backdrop-blur-sm border border-border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Scrollable Grid Container */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {searchQuery === "" ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">
                Start searching...
              </p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">
                No books found matching your search
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
    </>
  );
}
