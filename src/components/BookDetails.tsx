import { generateTelegramBookUrl } from "@/lib/bot";
import { Send } from "lucide-react";
import { cn } from "../lib/utils";
import { BookImage } from "./BookImage";
import { Separator } from "./ui/separator";

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

interface Location {
  id: number;
  name: string;
}

interface BookCopy {
  qrCodeId: string;
  bookId: number;
  copyNumber: number;
  status: string | null;
  loans: Loan[];
  location: Location;
}

export interface BookDetail {
  id: number;
  isbn: string;
  title: string;
  author: string;
  imageUrl: string | null;
  description: string | null;
  createdAt: string;
  bookCopies: BookCopy[];
}

interface BookDetailsProps {
  book: BookDetail;
}

export function BookDetails({ book }: BookDetailsProps) {
  return (
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
                      <span className="text-base">
                        Available at{" "}
                        <span className="underline">{copy.location.name} </span>
                      </span>
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

        <a
          href={generateTelegramBookUrl(book.isbn!)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0 flex items-center justify-center gap-3 border border-border py-5 px-6 text-foreground font-serif transition-all duration-200 outline outline-transparent hover:outline-[#229ED9] hover:text-[#229ED9] hover:translate-x-2"
        >
          <Send className="h-5 w-5 transition-colors duration-200" />
          <span className="text-base">View on Telegram</span>
        </a>
      </div>
    </div>
  );
}
