import type { Book, BookCopy } from "@/types";

type BookDetailProps = {
  book: Book;
  copy: BookCopy;
  isBorrowed: boolean;
  onScanLocation: () => void;
  onBack: () => void;
};

export function BookDetailView({
  book,
  copy,
  isBorrowed,
  onScanLocation,
  onBack,
}: BookDetailProps) {
  // Check if the copy is available: no active loans and status is available
  const hasActiveLoan = copy.loans.length > 0;
  const unavailable =
    copy.status !== "available" || hasActiveLoan || isBorrowed;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tg-theme-bg-color,#fff)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tg-theme-section-bg-color,#f4f4f5)] text-[var(--tg-theme-text-color,#000)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[var(--tg-theme-text-color,#000)]">
          Book Details
        </h1>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
        {/* Cover */}
        <div className="flex justify-center">
          {book.imageUrl ? (
            <img
              src={book.imageUrl}
              alt={book.title}
              className="h-60 w-40 rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="flex h-60 w-40 items-center justify-center rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] shadow-md">
              <span className="text-4xl">📚</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1 text-center">
          <h2 className="text-xl font-bold text-[var(--tg-theme-text-color,#000)]">
            {book.title}
          </h2>
          <p className="text-[var(--tg-theme-hint-color,#999)]">
            {book.author}
          </p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          <MetaCard label="Copy #" value={String(copy.copyNumber)} />
          <MetaCard label="Location" value={copy.location.name} />
          <MetaCard label="ISBN" value={book.isbn} />
          <MetaCard
            label="Status"
            value={unavailable ? "Unavailable" : "Available"}
          />
        </div>

        {/* Description */}
        {book.description && (
          <p className="text-sm leading-relaxed text-[var(--tg-theme-text-color,#000)]">
            {book.description}
          </p>
        )}

        {/* Action */}
        <div className="mt-auto pb-4 mb-4">
          <button
            disabled={unavailable}
            onClick={onScanLocation}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)] disabled:opacity-40"
            style={{
              backgroundColor: "var(--tg-theme-button-color, #5288c1)",
            }}
          >
            {isBorrowed ? (
              "Already Borrowed"
            ) : !hasActiveLoan && copy.status === "available" ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
                Scan Location to Borrow
              </>
            ) : (
              "Currently Unavailable"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--tg-theme-section-bg-color,#f4f4f5)] p-3">
      <p className="text-xs text-[var(--tg-theme-hint-color,#999)]">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
        {value}
      </p>
    </div>
  );
}
