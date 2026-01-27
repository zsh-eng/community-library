export function BookNotFound({
  scannedText,
  onRetry,
  onHome,
}: {
  scannedText: string;
  onRetry: () => void;
  onHome: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--tg-theme-bg-color,#fff)] p-6">
      {/* Warning icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-xl font-bold text-[var(--tg-theme-text-color,#000)]">
          Book Not Found
        </h2>
        <p className="text-sm text-[var(--tg-theme-hint-color,#999)]">
          The scanned QR code doesn&apos;t match any book in our library.
        </p>
        <p className="mt-1 rounded-lg bg-[var(--tg-theme-section-bg-color,#f4f4f5)] px-3 py-2 font-mono text-xs text-[var(--tg-theme-hint-color,#999)]">
          {scannedText}
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          onClick={onRetry}
          className="w-full rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)]"
          style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
        >
          Scan Again
        </button>
        <button
          onClick={onHome}
          className="w-full rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] py-3.5 font-medium text-[var(--tg-theme-text-color,#000)]"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
