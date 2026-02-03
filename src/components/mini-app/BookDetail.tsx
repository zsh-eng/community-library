import type { Book, BookCopy } from "@/types";

type BookDetailProps = {
  book: Book;
  copy: BookCopy;
  mode: "borrow" | "return";
  isBorrowed: boolean;
  onScanLocation: () => void;
  onScanReturn: () => void;
};

export function BookDetailView({
  book,
  copy,
  mode,
  isBorrowed,
  onScanLocation,
  onScanReturn,
}: BookDetailProps) {
  // Check if the copy is available: no active loans and status is available
  const hasActiveLoan = copy.loans.length > 0;
  const unavailable =
    copy.status !== "available" || hasActiveLoan || isBorrowed;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tg-theme-bg-color,#fff)] pt-16">
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

        {/* Spacer so content isn't hidden behind fixed button */}
        <div className="h-20" />
      </div>

      {/* Fixed action button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-[var(--tg-theme-bg-color,#fff)] from-60% to-transparent">
        {mode === "return" ? (
          <button
            onClick={onScanReturn}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)]"
            style={{
              backgroundColor: "var(--tg-theme-button-color, #5288c1)",
            }}
          >
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
            Scan QR at
            <span className="font-bold">{copy.location.name}</span> to return
          </button>
        ) : (
          <button
            disabled={unavailable}
            onClick={onScanLocation}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)] bg-(--tg-theme-button-color,#5288c1) disabled:bg-[var(--tg-theme-section-bg-color,#f4f4f5)]"
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
                Scan QR at
                <span className="font-bold">{copy.location.name}</span> to
                borrow
              </>
            ) : (
              "Currently Unavailable"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] p-3">
      <p className="text-xs text-[var(--tg-theme-hint-color,#999)]">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
        {value}
      </p>
    </div>
  );
}
