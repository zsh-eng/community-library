import { BookDetailView } from "@/components/mini-app/BookDetail";
import { BookNotFound } from "@/components/mini-app/BookNotFound";
import { BorrowConfirmation } from "@/components/mini-app/BorrowConfirmation";
import { UserProfile } from "@/components/mini-app/UserProfile";
import type { BorrowRecord } from "@/data/borrow-store";
import { useBookCopyLookup } from "@/hooks/use-book-query";
import { useBorrowStore } from "@/hooks/use-borrow-store";
import { useTelegramUser } from "@/hooks/use-telegram-user";
import { initTelegramSdk } from "@/lib/telegram";
import type { BookCopy, BookDetail, Location } from "@/types";
import { popup, qrScanner } from "@telegram-apps/sdk-react";
import { useEffect, useState } from "react";
import "../mini-app.css";

type View =
  | { name: "home" }
  | { name: "scanning"; qrCodeId: string }
  | { name: "book-detail"; book: BookDetail; copy: BookCopy }
  | { name: "borrow-confirmation"; record: BorrowRecord }
  | { name: "book-not-found"; scannedText: string };

function MiniApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initTelegramSdk().then(() => setReady(true));
  }, []);

  const user = useTelegramUser();
  const userId = user?.id ?? 0;
  const store = useBorrowStore(userId);
  const [view, setView] = useState<View>({ name: "home" });

  // Fetch book copy when scanning
  const scanningQrCode = view.name === "scanning" ? view.qrCodeId : null;
  const {
    data: lookupResult,
    isLoading,
    error,
  } = useBookCopyLookup(scanningQrCode);

  // Handle lookup result
  useEffect(() => {
    if (view.name !== "scanning") return;

    if (isLoading) return;

    if (error || !lookupResult) {
      setView({ name: "book-not-found", scannedText: view.qrCodeId });
      return;
    }

    setView({
      name: "book-detail",
      book: lookupResult.book,
      copy: lookupResult.copy,
    });
  }, [view, isLoading, error, lookupResult]);

  function handleScanned(text: string) {
    // Trigger the lookup by setting scanning state
    setView({ name: "scanning", qrCodeId: text.trim() });
  }

  async function handleScannerOpen() {
    try {
      const result = await qrScanner.open({
        text: "Point your camera at a book QR code",
        capture: () => true,
      });
      if (result) {
        handleScanned(result);
      }
    } catch {
      // Scanner closed by user, ignore
    }
  }

  async function handleLocationScan(book: BookDetail, copy: BookCopy) {
    try {
      const scanned = await qrScanner.open({
        text: `Scan the ${copy.location.name} location QR code`,
        capture: () => true,
      });

      if (!scanned) return;

      const scannedLocationName = scanned.trim();

      // Check if it matches the expected location name
      if (!isValidLocation(scannedLocationName, copy.location)) {
        popup.show({
          title: "Wrong Location",
          message: `This book is located at ${copy.location.name}. You scanned "${scannedLocationName}". Please go to the correct location.`,
          buttons: [{ type: "ok" }],
        });
        return;
      }

      // Location verified, proceed with borrowing
      const record = store.borrow(book, copy);
      setView({ name: "borrow-confirmation", record });
    } catch {
      // Scanner closed by user, ignore
    }
  }

  // Show loading state while scanning
  if (view.name === "scanning") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--tg-theme-bg-color,#fff)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" />
          <p className="text-[var(--tg-theme-hint-color,#999)]">
            Looking up book...
          </p>
        </div>
      </div>
    );
  }

  if (view.name === "book-detail") {
    return (
      <BookDetailView
        book={view.book}
        copy={view.copy}
        isBorrowed={store.isBorrowed(view.copy.qrCodeId)}
        onScanLocation={() => handleLocationScan(view.book, view.copy)}
        onBack={() => setView({ name: "home" })}
      />
    );
  }

  if (view.name === "borrow-confirmation") {
    return (
      <BorrowConfirmation
        record={view.record}
        onDone={() => setView({ name: "home" })}
      />
    );
  }

  if (view.name === "book-not-found") {
    return (
      <BookNotFound
        scannedText={view.scannedText}
        onRetry={handleScannerOpen}
        onHome={() => setView({ name: "home" })}
      />
    );
  }

  // Home view
  const borrowed = store.myBorrows();

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tg-theme-bg-color,#fff)]">
      <div className="flex flex-col gap-5 p-4">
        {/* User profile */}
        {user && <UserProfile user={user} />}

        {/* Scan button */}
        <button
          onClick={handleScannerOpen}
          className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)]"
          style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
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
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <rect x="7" y="7" width="10" height="10" rx="1" />
          </svg>
          Scan Book QR Code
        </button>

        {/* Borrowed books list */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--tg-theme-section-header-text-color,#6d6d71)]">
            My Borrowed Books
          </h2>
          {borrowed.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--tg-theme-hint-color,#999)]">
              No books borrowed yet. Scan a QR code to get started.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {borrowed.map((record) => (
                <div
                  key={record.copy.qrCodeId}
                  className="flex items-center gap-3 rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] p-3"
                >
                  {record.book.imageUrl ? (
                    <img
                      src={record.book.imageUrl}
                      alt={record.book.title}
                      className="h-16 w-11 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-11 items-center justify-center rounded-md bg-[var(--tg-theme-bg-color,#fff)]">
                      <span className="text-xl">📚</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--tg-theme-text-color,#000)]">
                      {record.book.title}
                    </p>
                    <p className="text-sm text-[var(--tg-theme-hint-color,#999)]">
                      {record.book.author}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--tg-theme-subtitle-text-color,#999)]">
                      Due:{" "}
                      {record.dueDate.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Check if the scanned location matches the expected location.
 * Matches by name (case-insensitive).
 */
function isValidLocation(scannedText: string, expected: Location): boolean {
  return scannedText.toLowerCase() === expected.name.toLowerCase();
}

export default MiniApp;
