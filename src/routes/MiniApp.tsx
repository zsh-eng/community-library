import { AddCopyFlow } from "@/components/mini-app/AddCopyFlow";
import { BookAdminView } from "@/components/mini-app/BookAdminView";
import { BookDetailView } from "@/components/mini-app/BookDetail";
import { BookNotFound } from "@/components/mini-app/BookNotFound";
import { BorrowConfirmation } from "@/components/mini-app/BorrowConfirmation";
import { ReturnConfirmation } from "@/components/mini-app/ReturnConfirmation";
import { UserProfile } from "@/components/mini-app/UserProfile";
import { useAddBookCopy } from "@/hooks/use-add-book-copy";
import { useBookCopyLookup, useBookDetail } from "@/hooks/use-book-query";
import { type BorrowResult, useBorrowBook } from "@/hooks/use-borrow-book";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLocations } from "@/hooks/use-locations";
import { type ReturnResult, useReturnBook } from "@/hooks/use-return-book";
import { useTelegramUser } from "@/hooks/use-telegram-user";
import { useUserLoans } from "@/hooks/use-user-loans";
import { classifyLocationScan, extractBookQrParam } from "@/lib/qr";
import { initTelegramSdk } from "@/lib/telegram";
import type { Book, BookCopy, BookDetail, Location } from "@/types";
import { backButton, popup, qrScanner } from "@telegram-apps/sdk-react";
import { useEffect, useState } from "react";
import "../mini-app.css";

type View =
  | { name: "home" }
  | { name: "scanning"; qrCodeId: string }
  | {
      name: "book-detail";
      book: Book;
      copy: BookCopy;
      state: "available" | "borrowed-by-user" | "borrowed-by-other";
    }
  | { name: "borrowing"; book: Book; copy: BookCopy }
  | { name: "borrow-confirmation"; result: BorrowResult; copy: BookCopy }
  | { name: "returning"; book: Book; copy: BookCopy }
  | { name: "return-confirmation"; result: ReturnResult; copy: BookCopy }
  | { name: "book-not-found"; scannedText: string }
  | { name: "book-admin"; bookId: number }
  | {
      name: "add-copy";
      bookId: number;
      book: BookDetail;
      step: "scan" | "location" | "confirm";
      scannedQrId?: string;
      selectedLocation?: Location;
    }
  | { name: "add-copy-success"; book: BookDetail; copyNumber: number };

function MiniApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initTelegramSdk().then((startParam) => {
      setReady(true);
      if (startParam) {
        // Check if it's an admin view request (format: admin_<bookId>)
        const adminMatch = startParam.match(/^admin_(\d+)$/);
        if (adminMatch) {
          const bookId = parseInt(adminMatch[1], 10);
          setView({ name: "book-admin", bookId });
        } else {
          // Treat as QR code ID (existing behavior)
          setView({ name: "scanning", qrCodeId: startParam });
        }
      }
    });
  }, []);

  const user = useTelegramUser();
  const { data: currentUserData } = useCurrentUser();
  const isAdmin = currentUserData?.isAdmin ?? false;
  const { data: loans = [], isLoading: loansLoading } = useUserLoans();
  const { data: locations = [] } = useLocations();
  const borrowMutation = useBorrowBook();
  const returnMutation = useReturnBook();
  const addCopyMutation = useAddBookCopy();
  const [view, setView] = useState<View>({ name: "home" });

  // Fetch book detail for admin view
  const adminBookId = view.name === "book-admin" ? view.bookId : null;
  const addCopyBookId = view.name === "add-copy" ? view.bookId : null;
  const { data: adminBook, isLoading: adminBookLoading } = useBookDetail(
    adminBookId ?? addCopyBookId,
  );

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

    const isBorrowedByUser = loans.some(
      (loan) => loan.qrCodeId === lookupResult.copy.qrCodeId,
    );
    const isBorrowedByOther =
      lookupResult.copy.status !== "available" ||
      lookupResult.copy.loans.length > 0;
    setView({
      name: "book-detail",
      book: lookupResult.book,
      copy: lookupResult.copy,
      state: isBorrowedByUser
        ? "borrowed-by-user"
        : isBorrowedByOther
          ? "borrowed-by-other"
          : "available",
    });
  }, [view, isLoading, error, lookupResult, loans]);

  function handleScanned(text: string) {
    // Trigger the lookup by setting scanning state
    setView({ name: "scanning", qrCodeId: text.trim() });
  }

  function handleLoanTap(qrCodeId: string) {
    setView({ name: "scanning", qrCodeId });
  }

  async function handleScannerOpen() {
    try {
      const result = await qrScanner.open({
        text: "Point your camera at a book QR code",
        capture: () => true,
      });
      if (result) {
        const bookCode = extractBookQrParam(result);
        if (!bookCode) {
          popup.show({
            title: "Not a Book QR",
            message:
              "This doesn't look like a library book QR. Try scanning the code sticker inside the book.",
            buttons: [{ type: "ok" }],
          });
          return;
        }
        handleScanned(bookCode);
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

      const scanResult = classifyLocationScan(scanned, copy.location);
      if (scanResult.type === "book") {
        popup.show({
          title: "Book QR Scanned",
          message:
            "You scanned a book QR. For borrowing, scan the location QR posted at the library spot.",
          buttons: [{ type: "ok" }],
        });
        return;
      }

      if (scanResult.type === "invalid") {
        const scannedLocationName = scanned.trim();
        popup.show({
          title: "Wrong Location",
          message: `This book is located at ${copy.location.name}. You scanned "${scannedLocationName || "unknown"}". Please go to the correct location QR.`,
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
        setView({
          name: "book-detail",
          book,
          copy,
          state: "available",
        });
      }
    } catch {
      // Scanner closed by user, ignore
    }
  }

  async function handleReturnScan(book: Book, copy: BookCopy) {
    try {
      const scanned = await qrScanner.open({
        text: `Scan QR at 📍${copy.location.name} to return`,
        capture: () => true,
      });

      if (!scanned) return;

      const scanResult = classifyLocationScan(scanned, copy.location);
      if (scanResult.type === "book") {
        popup.show({
          title: "Book QR Scanned",
          message:
            "You scanned a book QR. For returns, scan the location QR at the library spot.",
          buttons: [{ type: "ok" }],
        });
        return;
      }

      if (scanResult.type === "invalid") {
        const scannedLocationName = scanned.trim();
        popup.show({
          title: "Wrong Location",
          message: `Please return this book to ${copy.location.name}. You scanned "${scannedLocationName || "unknown"}".`,
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
        setView({
          name: "book-detail",
          book,
          copy,
          state: "borrowed-by-user",
        });
      }
    } catch {
      // Scanner closed by user, ignore
    }
  }

  // Admin: navigate to admin view for a book
  function handleViewAsAdmin(bookId: number) {
    setView({ name: "book-admin", bookId });
  }

  // Admin: start add copy flow
  function handleStartAddCopy(book: BookDetail) {
    setView({
      name: "add-copy",
      bookId: book.id,
      book,
      step: "scan",
    });
  }

  // Admin: scan QR for new copy
  async function handleAddCopyScan() {
    if (view.name !== "add-copy") return;

    try {
      const scanned = await qrScanner.open({
        text: "Scan the QR sticker for the new book copy",
        capture: () => true,
      });

      if (!scanned) return;

      // For add copy flow, we accept raw QR codes (not book URLs)
      const qrCodeId = scanned.trim();
      if (!qrCodeId) {
        popup.show({
          title: "Invalid QR",
          message: "Could not read QR code. Please try again.",
          buttons: [{ type: "ok" }],
        });
        return;
      }

      const matchingCopies = view.book.bookCopies.filter(
        (copy) => copy.qrCodeId === qrCodeId,
      );
      if (matchingCopies.length === 1) {
        const existingCopy = matchingCopies[0];
        popup.show({
          title: "Copy Already Exists",
          message: `Copy #${existingCopy.copyNumber} already uses this QR code. Please scan a new sticker.`,
          buttons: [{ type: "ok" }],
        });
        return;
      }

      setView({
        ...view,
        step: "location",
        scannedQrId: qrCodeId,
      });
    } catch {
      // Scanner closed by user, ignore
    }
  }

  // Admin: select location for new copy
  function handleSelectLocation(location: Location) {
    if (view.name !== "add-copy") return;

    setView({
      ...view,
      step: "confirm",
      selectedLocation: location,
    });
  }

  // Admin: confirm and create new copy
  async function handleConfirmAddCopy() {
    if (view.name !== "add-copy" || !view.scannedQrId || !view.selectedLocation)
      return;

    try {
      const result = await addCopyMutation.mutateAsync({
        bookId: view.bookId,
        qrCodeId: view.scannedQrId,
        locationId: view.selectedLocation.id,
      });

      if (result.success && result.copy) {
        setView({
          name: "add-copy-success",
          book: view.book,
          copyNumber: result.copy.copyNumber,
        });
      }
    } catch (error) {
      popup.show({
        title: "Failed to Add Copy",
        message: error instanceof Error ? error.message : "Failed to add copy",
        buttons: [{ type: "ok" }],
      });
    }
  }

  // Show loading state while scanning, borrowing, or returning
  if (
    view.name === "scanning" ||
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
        state={view.state}
        onScanLocation={() => handleLocationScan(view.book, view.copy)}
        onScanReturn={() => handleReturnScan(view.book, view.copy)}
        isAdmin={isAdmin}
        onViewAsAdmin={() => handleViewAsAdmin(view.book.id)}
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

  // Admin: Book admin view
  if (view.name === "book-admin") {
    if (adminBookLoading || !adminBook) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--tg-theme-bg-color,#fff)]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--tg-theme-button-color,#5288c1)] border-t-transparent" />
            <p className="text-[var(--tg-theme-hint-color,#999)]">
              Loading book...
            </p>
          </div>
        </div>
      );
    }

    return (
      <BookAdminView
        book={adminBook}
        onAddCopy={() => handleStartAddCopy(adminBook)}
        onBack={() => setView({ name: "home" })}
      />
    );
  }

  // Admin: Add copy flow
  if (view.name === "add-copy") {
    return (
      <AddCopyFlow
        book={view.book}
        step={view.step}
        scannedQrId={view.scannedQrId}
        selectedLocation={view.selectedLocation}
        locations={locations}
        onScan={handleAddCopyScan}
        onSelectLocation={handleSelectLocation}
        onConfirm={handleConfirmAddCopy}
        onCancel={() => setView({ name: "book-admin", bookId: view.bookId })}
        isSubmitting={addCopyMutation.isPending}
      />
    );
  }

  // Admin: Add copy success
  if (view.name === "add-copy-success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--tg-theme-bg-color,#fff)] p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-xl font-bold text-[var(--tg-theme-text-color,#000)]">
            Copy Added!
          </h2>
          <p className="text-[var(--tg-theme-hint-color,#999)]">
            Copy #{view.copyNumber} of "{view.book.title}" has been added to the
            library.
          </p>
        </div>
        <button
          onClick={() => setView({ name: "book-admin", bookId: view.book.id })}
          className="mt-4 w-full max-w-sm rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)]"
          style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
        >
          Back to Book
        </button>
      </div>
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

export default MiniApp;
