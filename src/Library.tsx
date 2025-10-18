import { hc } from "hono/client";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { AppType } from "../worker/index";

const client = hc<AppType>(import.meta.env.BASE_URL);

interface Book {
  id: number;
  isbn: string | null;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading library...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-serif font-bold mb-4">Library</h1>

        {/* Sticky Search Bar */}
        <div className="sticky top-0 z-10 bg-background border-b border-border sm:-mx-6 lg:-mx-8 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title or author"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-muted border-none outline-none text-base focus:bg-muted/80 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Sticky Book Count */}
        <div className="sticky top-[73px] z-10 bg-background border-b border-border sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            <p className="text-sm text-muted-foreground font-medium">
              {filteredBooks.length}{" "}
              {filteredBooks.length === 1 ? "book" : "books"}
            </p>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="py-8">
          {filteredBooks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">
                {searchQuery
                  ? "No books found matching your search"
                  : "No books in library"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredBooks.map((book) => (
                <Link
                  key={book.id}
                  to={`/book/${book.id}`}
                  className="group cursor-pointer"
                >
                  <div className="space-y-3">
                    {/* Book Cover */}
                    <div className="aspect-[2/3] relative overflow-hidden bg-muted shadow-lg rounded-sm transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[102%]">
                      {book.imageUrl ? (
                        <img
                          src={book.imageUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
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
                      <h3 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
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
          )}
        </div>
      </div>
    </div>
  );
}

export default Library;
