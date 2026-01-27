import { BookDetail } from "@/components/mini-app/BookDetail.tsx";
import { BookNotFound } from "@/components/mini-app/BookNotFound.tsx";
import { BorrowConfirmation } from "@/components/mini-app/BorrowConfirmation.tsx";
import { UserProfile } from "@/components/mini-app/UserProfile.tsx";
import type { Book, LocationCode } from "@/data/books.ts";
import { lookupBook } from "@/data/books.ts";
import type { BorrowRecord } from "@/data/borrow-store.ts";
import { useBorrowStore } from "@/hooks/use-borrow-store.ts";
import { useTelegramUser } from "@/hooks/use-telegram-user.ts";
import { initTelegramSdk } from "@/lib/telegram";
import { popup, qrScanner } from "@telegram-apps/sdk-react";
import { useEffect, useState } from "react";
import "../mini-app.css";

const VALID_LOCATIONS: LocationCode[] = ["ELM", "CENDANA", "SAGA"];

type View =
  | { name: "home" }
  | { name: "book-detail"; book: Book }
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

  function handleScanned(text: string) {
    const book = lookupBook(text);
    if (book) {
      setView({ name: "book-detail", book });
    } else {
      setView({ name: "book-not-found", scannedText: text });
    }
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

  async function handleLocationScan(book: Book) {
    try {
      const scanned = await qrScanner.open({
        text: `Scan the ${book.locationQrCode} location QR code`,
        capture: () => true,
      });

      if (!scanned) return;

      const locationCode = scanned.trim().toUpperCase();

      // Check if it's a valid location code
      if (!VALID_LOCATIONS.includes(locationCode as LocationCode)) {
        popup.show({
          title: "Invalid QR Code",
          message:
            "Please scan a valid location QR code (ELM, CENDANA, or SAGA).",
          buttons: [{ type: "ok" }],
        });
        return;
      }

      // Check if location matches the book's location
      if (locationCode !== book.locationQrCode) {
        popup.show({
          title: "Wrong Location",
          message: `This book is located at ${book.locationQrCode}. You scanned ${locationCode}. Please go to the correct location.`,
          buttons: [{ type: "ok" }],
        });
        return;
      }

      // Location verified, proceed with borrowing
      const record = store.borrow(book);
      setView({ name: "borrow-confirmation", record });
    } catch {
      // Scanner closed by user, ignore
    }
  }

  if (view.name === "book-detail") {
    return (
      <BookDetail
        book={view.book}
        isBorrowed={store.isBorrowed(view.book.id)}
        onScanLocation={() => handleLocationScan(view.book)}
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
                  key={record.book.id}
                  className="flex items-center gap-3 rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] p-3"
                >
                  <img
                    src={record.book.coverUrl}
                    alt={record.book.title}
                    className="h-16 w-11 rounded-md object-cover"
                  />
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

export default MiniApp;
