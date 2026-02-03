import type { BookDetail, BookCopy } from "@/types";

type BookAdminViewProps = {
  book: BookDetail;
  onAddCopy: () => void;
  onBack: () => void;
};

export function BookAdminView({ book, onAddCopy, onBack }: BookAdminViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--tg-theme-bg-color,#fff)]">
      {/* Content */}
      <div className="flex flex-1 flex-col gap-5 p-4">
        {/* Cover and basic info */}
        <div className="flex gap-4">
          {book.imageUrl ? (
            <img
              src={book.imageUrl}
              alt={book.title}
              className="h-32 w-22 flex-shrink-0 rounded-lg object-cover shadow-md"
            />
          ) : (
            <div className="flex h-32 w-22 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--tg-theme-section-bg-color,#f4f4f5)] shadow-md">
              <span className="text-3xl">📚</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-[var(--tg-theme-text-color,#000)]">
              {book.title}
            </h2>
            <p className="text-sm text-[var(--tg-theme-hint-color,#999)]">
              {book.author}
            </p>
            <p className="text-xs text-[var(--tg-theme-subtitle-text-color,#6d6d71)]">
              ISBN: {book.isbn}
            </p>
          </div>
        </div>

        {/* Description */}
        {book.description && (
          <p className="text-sm leading-relaxed text-[var(--tg-theme-text-color,#000)]">
            {book.description}
          </p>
        )}

        {/* Copies section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--tg-theme-section-header-text-color,#6d6d71)]">
              Copies ({book.bookCopies.length})
            </h3>
            <button
              onClick={onAddCopy}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--tg-theme-button-text-color,#fff)]"
              style={{
                backgroundColor: "var(--tg-theme-button-color, #5288c1)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Copy
            </button>
          </div>

          {book.bookCopies.length === 0 ? (
            <div className="overflow-hidden rounded-2xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)]">
              <p className="py-8 text-center text-sm text-[var(--tg-theme-hint-color,#999)]">
                No copies yet. Add a copy to make this book available.
              </p>
            </div>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-2xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)]">
              {book.bookCopies.map((copy, index) => (
                <CopyRow key={copy.qrCodeId} copy={copy} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Spacer for fixed button */}
        <div className="h-20" />
      </div>

      {/* Fixed back button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-[var(--tg-theme-bg-color,#fff)] from-60% to-transparent">
        <button
          onClick={onBack}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-[var(--tg-theme-hint-color,#999)] bg-[var(--tg-theme-section-bg-color,#f4f4f5)]"
        >
          Back
        </button>
      </div>
    </div>
  );
}

function CopyRow({ copy, index }: { copy: BookCopy; index: number }) {
  const hasActiveLoan = copy.loans.length > 0;
  const loan = hasActiveLoan ? copy.loans[0] : null;
  const isAvailable = copy.status === "available" && !hasActiveLoan;

  return (
    <>
      {index > 0 && <div className="mx-4 h-px bg-tg-separator" />}
      <div className="flex items-center justify-between p-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--tg-theme-text-color,#000)]">
              Copy #{copy.copyNumber}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isAvailable
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {isAvailable ? "Available" : "Borrowed"}
            </span>
          </div>
          <span className="text-xs text-[var(--tg-theme-hint-color,#999)]">
            {copy.location.name}
          </span>
          {loan && (
            <span className="text-xs text-[var(--tg-theme-subtitle-text-color,#6d6d71)]">
              Due:{" "}
              {new Date(loan.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              {loan.telegramUsername && ` • @${loan.telegramUsername}`}
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--tg-theme-hint-color,#999)] font-mono">
          {copy.qrCodeId.substring(0, 8)}...
        </span>
      </div>
    </>
  );
}
