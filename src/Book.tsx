import { useDataCache } from "@/hooks/use-data-cache";
import { hc } from "hono/client";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import type { AppType } from "../worker/index";
import { BookDetails, type BookDetail } from "./components/BookDetails";

const client = hc<AppType>(import.meta.env.BASE_URL);

interface BookProps {
  id: string;
}

function Book({ id }: BookProps) {
  const {
    data: book,
    loading,
    error,
  } = useDataCache<BookDetail>(
    id ? `book-${id}` : null,
    async () => {
      if (!id) throw new Error("No book ID provided");

      const res = await client.api.books[":id"].$get({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Book not found");
      }

      const data = await res.json();
      return data.book;
    },
    { enabled: !!id },
  );

  if (loading) {
    return null;
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
    <div className="container mx-auto px-4 py-16">
      <Link
        to="/"
        className="text-muted-foreground hover:text-primary transition duration-300 hover:scale-105 group absolute top-8 left-8"
      >
        <ArrowLeft className="group-hover:-translate-x-1 transition" />
      </Link>

      <BookDetails book={book} />
    </div>
  );
}

export default Book;
