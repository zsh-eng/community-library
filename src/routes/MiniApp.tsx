import { BookDetailView } from "@/components/mini-app/BookDetail";
import { BookNotFound } from "@/components/mini-app/BookNotFound";
import { BorrowConfirmation } from "@/components/mini-app/BorrowConfirmation";
import { ReturnConfirmation } from "@/components/mini-app/ReturnConfirmation";
import { UserProfile } from "@/components/mini-app/UserProfile";
import { useBookCopyLookup } from "@/hooks/use-book-query";
import { type BorrowResult, useBorrowBook } from "@/hooks/use-borrow-book";
import { type ReturnResult, useReturnBook } from "@/hooks/use-return-book";
import { useTelegramUser } from "@/hooks/use-telegram-user";
import { useUserLoans } from "@/hooks/use-user-loans";
import { initTelegramSdk } from "@/lib/telegram";
import type { Book, BookCopy, Location } from "@/types";
import { backButton, popup, qrScanner } from "@telegram-apps/sdk-react";
import { useEffect, useState } from "react";
import "../mini-app.css";

type View =
  | { name: "home" }
  | { name: "scanning"; qrCodeId: string }
  | { name: "scanning-for-return"; qrCodeId: string }
  | {
      name: "book-detail";
      book: Book;
      copy: BookCopy;
      mode: "borrow" | "return";
    }
  | { name: "borrowing"; book: Book; copy: BookCopy }
  | { name: "borrow-confirmation"; result: BorrowResult; copy: BookCopy }
  | { name: "returning"; book: Book; copy: BookCopy }
  | { name: "return-confirmation"; result: ReturnResult; copy: BookCopy }
  | { name: "book-not-found"; scannedText: string };

function MiniApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initTelegramSdk().then(() => setReady(true));
  }, []);

  const user = useTelegramUser();
  const { data: loans = [], isLoading: loansLoading } = useUserLoans();
  const borrowMutation = useBorrowBook();
  const returnMutation = useReturnBook();
  const [view, setView] = useState<View>({ name: "home" });

  // Telegram back button: show on all screens except home
  useEffect(() => {
    if (!backButton.mount.isAvailable()) return;
    backButton.mount();

    const goHome = () => setView({ name: "home" });

    if (view.name === "home") {
      backButton.hide();
    } else {
      backButton.show();
    }

    const off = backButton.onClick(goHome);
    return () => {
      off();
      backButton.hide();
    };
  }, [view.name]);

  // Fetch book copy when scanning (for borrow or return)
  const scanningQrCode =
    view.name === "scanning" || view.name === "scanning-for-return"
      ? view.qrCodeId
      : null;
  const {
    data: lookupResult,
    isLoading,
    error,
  } = useBookCopyLookup(scanningQrCode);

  // Handle lookup result
  useEffect(() => {
    if (view.name !== "scanning" && view.name !== "scanning-for-return") return;

    if (isLoading) return;

    if (error || !lookupResult) {
      setView({ name: "book-not-found", scannedText: view.qrCodeId });
      return;
    }

    const mode = view.name === "scanning-for-return" ? "return" : "borrow";
    setView({
      name: "book-detail",
      book: lookupResult.book,
      copy: lookupResult.copy,
      mode,
    });
  }, [view, isLoading, error, lookupResult]);

  function handleScanned(text: string) {
    // Trigger the lookup by setting scanning state
    setView({ name: "scanning", qrCodeId: text.trim() });
  }

  function handleLoanTap(qrCodeId: string) {
    // Trigger lookup for return mode
    setView({ name: "scanning-for-return", qrCodeId });
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

  async function handleLocationScan(book: Book, copy: BookCopy) {
    try {
      const scanned = await qrScanner.open({
        text: `Scan QR at 📍${copy.location.name} to borrow`,
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
      setView({ name: "borrowing", book, copy });
      try {
        const result = await borrowMutation.mutateAsync(copy.qrCodeId);
        setView({ name: "borrow-confirmation", result, copy });
      } catch (error) {
        popup.show({
          title: "Borrow Failed",
          message:
            error instanceof Error ? error.message : "Failed to borrow book",
          buttons: [{ type: "ok" }],
        });
        setView({ name: "book-detail", book, copy, mode: "borrow" });
      }
    } catch {
      // Scanner closed by user, ignore
    }
  }

  // Check if a book copy is already borrowed by the user
  function isBorrowedByUser(qrCodeId: string): boolean {
    return loans.some((loan) => loan.qrCodeId === qrCodeId);
  }

  async function handleReturnScan(book: Book, copy: BookCopy) {
    try {
      const scanned = await qrScanner.open({
        text: `Scan QR at 📍${copy.location.name} to return`,
        capture: () => true,
      });

      if (!scanned) return;

      const scannedLocationName = scanned.trim();

      // Check if it matches the expected location name
      if (!isValidLocation(scannedLocationName, copy.location)) {
        popup.show({
          title: "Wrong Location",
          message: `Please return this book to ${copy.location.name}. You scanned "${scannedLocationName}".`,
          buttons: [{ type: "ok" }],
        });
        return;
      }

      // Location verified, proceed with return
      setView({ name: "returning", book, copy });
      try {
        const result = await returnMutation.mutateAsync(copy.qrCodeId);
        setView({ name: "return-confirmation", result, copy });
      } catch (error) {
        popup.show({
          title: "Return Failed",
          message:
            error instanceof Error ? error.message : "Failed to return book",
          buttons: [{ type: "ok" }],
        });
        setView({ name: "book-detail", book, copy, mode: "return" });
      }
    } catch {
      // Scanner closed by user, ignore
    }
  }

  // Show loading state while scanning, borrowing, or returning
  if (
    view.name === "scanning" ||
    view.name === "scanning-for-return" ||
    view.name === "borrowing" ||
    view.name === "returning"
  ) {
    const message =
      view.name === "scanning"
        ? "Looking up book..."
        : view.name === "borrowing"
          ? "Borrowing book..."
          : "Returning book...";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--tg-theme-bg-color,#fff)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" />
          <p className="text-[var(--tg-theme-hint-color,#999)]">{message}</p>
        </div>
      </div>
    );
  }

  if (view.name === "book-detail") {
    return (
      <BookDetailView
        book={view.book}
        copy={view.copy}
        mode={view.mode}
        isBorrowed={isBorrowedByUser(view.copy.qrCodeId)}
        onScanLocation={() => handleLocationScan(view.book, view.copy)}
        onScanReturn={() => handleReturnScan(view.book, view.copy)}
      />
    );
  }

  if (view.name === "borrow-confirmation") {
    return (
      <BorrowConfirmation
        result={view.result}
        copy={view.copy}
        onDone={() => setView({ name: "home" })}
      />
    );
  }

  if (view.name === "return-confirmation") {
    return (
      <ReturnConfirmation
        result={view.result}
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

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tg-theme-bg-color,#fff)]">
      <div className="flex flex-col gap-5 px-4 pt-2 pb-4">
        {/* User profile */}
        {user && <UserProfile user={user} />}

        {/* Scan button */}
        <div className="overflow-hidden rounded-2xl">
          <button
            onClick={handleScannerOpen}
            className="flex w-full items-center justify-center gap-2 py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)]"
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
        </div>

        {/* Borrowed books list */}
        <div className="flex flex-col gap-3 mt-4">
          <h2 className="pl-[15px] text-xs font-medium uppercase tracking-wide text-[var(--tg-theme-section-header-text-color,#6d6d71)]">
            My Borrowed Books
          </h2>
          {loansLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" />
            </div>
          ) : loans.length === 0 ? (
            <div className="overflow-hidden rounded-2xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)]">
              <p className="py-8 text-center text-sm text-[var(--tg-theme-hint-color,#999)]">
                No books borrowed yet. Scan a QR code to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-2xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)]">
              {loans.map((loan, index) => (
                <div key={loan.qrCodeId}>
                  {index > 0 && <div className="mx-8 h-px bg-tg-separator" />}
                  <button
                    onClick={() => handleLoanTap(loan.qrCodeId)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-opacity active:opacity-70"
                  >
                    {loan?.imageUrl ? (
                      <img
                        src={loan.imageUrl}
                        alt={loan.title}
                        className="h-16 w-11 rounded-md bg-[var(--tg-theme-bg-color,#fff)]"
                      />
                    ) : (
                      <div className="flex h-16 w-11 items-center justify-center rounded-md bg-[var(--tg-theme-bg-color,#fff)]">
                        <span className="text-xl">📚</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--tg-theme-text-color,#000)]">
                        {loan.title}
                      </p>
                      <p className="text-sm text-[var(--tg-theme-hint-color,#999)]">
                        {loan.author}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--tg-theme-subtitle-text-color,#999)]">
                        Due:{" "}
                        {new Date(loan.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--tg-theme-hint-color, #999)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
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
