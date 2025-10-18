import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hc } from "hono/client";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const res = await client.api.books.$get();
        const data = await res.json();
        setBooks(data.books);
      } catch (error) {
        console.error("Failed to fetch books:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading books...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Community Library</h1>

      {books.length === 0 ? (
        <p className="text-muted-foreground">No books found in the library.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => (
            <Link key={book.id} to={`/book/${book.id}`}>
              <Card className="hover:shadow-lg transition-shadow h-full">
                {book.imageUrl && (
                  <div className="px-6 pt-6">
                    <img
                      src={book.imageUrl}
                      alt={book.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="line-clamp-2">{book.title}</CardTitle>
                  <CardDescription>{book.author}</CardDescription>
                </CardHeader>
                <CardContent>
                  {book.isbn && (
                    <p className="text-sm text-muted-foreground">
                      ISBN: {book.isbn}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Library;
