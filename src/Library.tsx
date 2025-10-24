import { BookDrawer } from "@/components/BookDrawer";
import { hc } from "hono/client";
import { Search } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
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

function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await client.api.books.$get();

        if (!res.ok) {
          setError("Failed to fetch books");
          return;
        }

        const data = await res.json();
        setBooks(data.books);
        setFilteredBooks(data.books);
      } catch (error) {
        console.error("Failed to fetch books:", error);
        setError("Failed to load books");
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  useEffect(() => {
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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg text-red-600">{error}</p>
      </div>
    );
  }

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
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Rounded Search Bar at Top */}
          <div className="sticky top-4 z-10 py-6">
            <div className="relative max-w-2xl mx-auto focus-within:scale-[102%] transition-all">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title or author"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-full outline-none text-base focus:ring-1 focus:ring-ring focus:border-transparent transition-all shadow-sm focus:shadow-md"
              />
            </div>
          </div>

          {/* Grid Layout */}
          <div className="py-8">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredBooks.map((book, index) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.05,
                      ease: "easeOut",
                    }}
                  >
                    <Link
                      to={`/book/${book.id}`}
                      className="group cursor-pointer block"
                      onClick={(e) => handleBookClick(book.id, e)}
                    >
                      <div className="space-y-3">
                        {/* Book Cover */}
                        <div className="aspect-[2/3] relative overflow-hidden bg-muted shadow-lg rounded-sm transition-all duration-150 group-hover:shadow-xl group-hover:scale-[102%]">
                          {book.imageUrl ? (
                            <motion.img
                              src={book.imageUrl}
                              alt={book.title}
                              className="w-full h-full object-cover"
                              initial={{ opacity: 0 }}
                              whileInView={{ opacity: 1 }}
                              viewport={{
                                once: true,
                                amount: "some",
                              }}
                              transition={{ duration: 0.5 }}
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
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Library;
