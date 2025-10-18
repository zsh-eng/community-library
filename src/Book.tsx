import { hc } from "hono/client";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { AppType } from "../worker/index";
import { BookImage } from "./components/BookImage";
import { Separator } from "./components/ui/separator";
import { cn } from "./lib/utils";
import { ArrowLeft } from "lucide-react";

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
      <Link
        to="/"
        className="text-muted-foreground hover:text-primary transition duration-300 hover:scale-105 group"
      >
        <ArrowLeft className="group-hover:-translate-x-1 transition" />
      </Link>

      <div className="max-w-4xl mx-auto">
        {book.imageUrl && <BookImage src={book.imageUrl} alt={book.title} />}

        <div className="mt-16 mb-8 px-4">
          <h1 className="text-2xl font-bold font-serif">{book.title}</h1>
          <p className="text-xl italic font-serif">{book.author}</p>
          <Separator className="!w-16 my-2 bg-primary" />

          {book.isbn && (
            <p className="text-xs text-muted-foreground mb-8">
              ISBN: {book.isbn}
            </p>
          )}

          {book.description && (
            <div className="prose max-w-none font-serif">
              <p className="text-base leading-relaxed">{book.description}</p>
            </div>
          )}

          <h2 className="mt-12 mb-8 text-xl font-bold font-serif italic">
            Copies
          </h2>

          {book.bookCopies.length === 0 ? (
            <p className="text-muted-foreground">
              No copies available in the library.
            </p>
          ) : (
            <div className="space-y-0 border border-border">
              {book.bookCopies.map((copy) => {
                const isAvailable = copy.loans.length === 0;
                const currentLoan = copy.loans.find((loan) => !loan.returnedAt);
                const dueDate = currentLoan
                  ? new Date(currentLoan.dueDate).toLocaleDateString()
                  : null;

                return (
                  <div
                    key={copy.qrCodeId}
                    className={cn(
                      "flex items-center border-b border-border last:border-b-0 transition-all duration-200 outline outline-transparent hover:outline-primary hover:translate-x-2 font-serif",
                      !isAvailable && "text-muted-foreground",
                    )}
                  >
                    <div className="flex items-center flex-1 py-4 px-6">
                      <span className="text-base">{copy.copyNumber}</span>
                      <div className="mx-6 h-8 w-px bg-border"></div>

                      {isAvailable && (
                        <span className="text-base">Available</span>
                      )}

                      {!isAvailable && (
                        <>
                          <span className="text-base">
                            Due on{" "}
                            {<span className="underline">{dueDate}</span>}{" "}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Book;
