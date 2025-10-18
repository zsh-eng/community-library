import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hc } from "hono/client";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AppType } from "../worker/index";

const client = hc<AppType>(import.meta.env.BASE_URL);

interface Loan {
  id: number;
  qrCodeId: string;
  telegramUserId: number;
  telegramUsername: string | null;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  lastReminderSent: string | null;
}

interface BookCopy {
  qrCodeId: string;
  bookId: number;
  copyNumber: number;
  status: string | null;
  loans: Loan[];
}

interface BookDetail {
  id: number;
  isbn: string | null;
  title: string;
  author: string;
  imageUrl: string | null;
  description: string | null;
  createdAt: string;
  bookCopies: BookCopy[];
}

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
      <Link to="/" className="text-blue-600 hover:underline mb-6 inline-block">
        ← Back to Library
      </Link>

      <div className="max-w-4xl mx-auto">
        {book.imageUrl && (
          <div className="mb-8 flex justify-center">
            <img
              src={book.imageUrl}
              alt={book.title}
              className="max-w-md w-full h-auto object-cover rounded-lg shadow-lg"
            />
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
          <p className="text-2xl text-muted-foreground mb-4">{book.author}</p>

          {book.isbn && (
            <p className="text-sm text-muted-foreground mb-4">
              ISBN: {book.isbn}
            </p>
          )}

          {book.description && (
            <div className="prose max-w-none">
              <p className="text-lg leading-relaxed">{book.description}</p>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available Copies</CardTitle>
            <CardDescription>
              {book.bookCopies.length}{" "}
              {book.bookCopies.length === 1 ? "copy" : "copies"} in the library
            </CardDescription>
          </CardHeader>
          <CardContent>
            {book.bookCopies.length === 0 ? (
              <p className="text-muted-foreground">
                No copies available in the library.
              </p>
            ) : (
              <div className="space-y-3">
                {book.bookCopies.map((copy) => {
                  const isAvailable = copy.loans.length === 0;
                  return (
                    <div
                      key={copy.qrCodeId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">Copy #{copy.copyNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Status: {copy.status || "available"}
                        </p>
                      </div>
                      <Badge variant={isAvailable ? "default" : "secondary"}>
                        {isAvailable ? "Available" : "Borrowed"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Book;
