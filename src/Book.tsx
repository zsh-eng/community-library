import { hc } from "hono/client";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { AppType } from "../worker/index";
import { ArrowLeft } from "lucide-react";
import { BookDetails, type BookDetail } from "./components/BookDetails";

const client = hc<AppType>(import.meta.env.BASE_URL);

function Book() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const res = await client.api.books[":id"].$get({
          param: { id },
        });

        if (!res.ok) {
          setError("Book not found");
          return;
        }

        const data = await res.json();
        setBook(data.book);
      } catch (error) {
        console.error("Failed to fetch book:", error);
        setError("Failed to load book details");
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading book details...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back to Library
        </Link>
        <p className="text-lg text-red-600">{error || "Book not found"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/"
        className="text-muted-foreground hover:text-primary transition duration-300 hover:scale-105 group"
      >
        <ArrowLeft className="group-hover:-translate-x-1 transition" />
      </Link>

      <BookDetails book={book} />
    </div>
  );
}

export default Book;
