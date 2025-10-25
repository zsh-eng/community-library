import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { generateTelegramBookUrl } from "@/lib/bot";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

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

function BookImage({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (imageError) {
    return (
      <div className="w-80 h-[480px] flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="w-60 md:w-80 perspective-1000">
      {!imageLoaded && (
        <Skeleton className="w-60 md:w-80 h-[480px] rounded-lg" />
      )}
      <div
        className={cn(
          "relative transition-transform duration-300 ease-out cursor-pointer",
          !imageLoaded && "hidden",
        )}
      >
        <img
          src={src}
          alt={alt}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className="w-full h-auto object-cover rounded-lg shadow-2xl"
          style={{
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          }}
        />
      </div>
    </div>
  );
}

export function BookDetails({ book }: BookDetailsProps) {
  return (
    <div className="w-full px-4 py-8">
      {/* Mobile Layout */}
      <div className="lg:hidden max-w-4xl mx-auto">
        {book.imageUrl && (
          <motion.div
            className="mb-12 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              y: { duration: 0.7 },
              opacity: { duration: 0.3 },
            }}
          >
            <BookImage src={book.imageUrl} alt={book.title} />
          </motion.div>
        )}
        <div>
          <motion.h1
            className="text-2xl font-bold font-serif"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {book.title}
          </motion.h1>
          <motion.p
            className="text-xl italic font-serif"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {book.author}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Separator className="!w-16 my-2 bg-primary" />
          </motion.div>

          {book.isbn && (
            <motion.p
              className="text-xs text-muted-foreground mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              ISBN: {book.isbn}
            </motion.p>
          )}

          {book.description && (
            <motion.div
              className="prose max-w-none font-serif"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <p className="text-base leading-relaxed">{book.description}</p>
            </motion.div>
          )}

          <motion.h2
            className="mt-12 mb-8 text-xl font-bold font-serif italic"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Copies
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {book.bookCopies.length === 0 ? (
              <p className="text-muted-foreground">
                No copies available in the library.
              </p>
            ) : (
              <div className="space-y-0 border border-border">
                {book.bookCopies.map((copy) => {
                  const isAvailable = copy.loans.length === 0;
                  const currentLoan = copy.loans.find(
                    (loan) => !loan.returnedAt,
                  );
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
                            <span className="underline">
                              {copy.location.name}{" "}
                            </span>
                          </span>
                        )}

                        {!isAvailable && (
                          <span className="text-base">
                            Due on{" "}
                            <span className="underline">{dueDate}</span>{" "}
                          </span>
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
          </motion.div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block max-w-[1400px] mx-auto">
        <div className="flex gap-16 items-start">
          {/* Image Column - Centered and Sticky */}
          {book.imageUrl && (
            <motion.div
              className="flex-1 flex justify-end sticky top-8 pr-16"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                y: { duration: 0.7 },
                opacity: { duration: 0.3 },
              }}
            >
              <BookImage src={book.imageUrl} alt={book.title} />
            </motion.div>
          )}

          {/* Content Column - Right aligned with max width */}
          <div
            className={cn(
              "w-full",
              book.imageUrl ? "max-w-[60ch]" : "max-w-4xl mx-auto",
            )}
          >
            <motion.h1
              className="text-2xl font-bold font-serif"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {book.title}
            </motion.h1>
            <motion.p
              className="text-xl italic font-serif"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {book.author}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Separator className="!w-16 my-2 bg-primary" />
            </motion.div>

            {book.isbn && (
              <motion.p
                className="text-xs text-muted-foreground mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                ISBN: {book.isbn}
              </motion.p>
            )}

            {book.description && (
              <motion.div
                className="prose max-w-none font-serif"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <p className="text-base leading-relaxed">{book.description}</p>
              </motion.div>
            )}

            <motion.h2
              className="mt-12 mb-8 text-xl font-bold font-serif italic"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              Copies
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              {book.bookCopies.length === 0 ? (
                <p className="text-muted-foreground">
                  No copies available in the library.
                </p>
              ) : (
                <div className="space-y-0 border border-border">
                  {book.bookCopies.map((copy) => {
                    const isAvailable = copy.loans.length === 0;
                    const currentLoan = copy.loans.find(
                      (loan) => !loan.returnedAt,
                    );
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
                              <span className="underline">
                                {copy.location.name}{" "}
                              </span>
                            </span>
                          )}

                          {!isAvailable && (
                            <span className="text-base">
                              Due on{" "}
                              <span className="underline">{dueDate}</span>{" "}
                            </span>
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
                <Send className="h-4 w-4 transition-colors duration-200" />
                <span className="text-base">View on Telegram</span>
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
