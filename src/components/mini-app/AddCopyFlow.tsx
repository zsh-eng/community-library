import type { Book, Location } from "@/types";

type AddCopyFlowProps = {
  book: Book;
  step: "scan" | "location" | "confirm";
  scannedQrCode?: string;
  selectedLocation?: Location;
  locations: Location[];
  onScan: () => void;
  onSelectLocation: (location: Location) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
};

export function AddCopyFlow({
  book,
  step,
  scannedQrCode,
  selectedLocation,
  locations,
  onScan,
  onSelectLocation,
  onConfirm,
  onCancel,
  isSubmitting,
}: AddCopyFlowProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--tg-theme-bg-color,#fff)]">
      <div className="flex flex-1 flex-col gap-5 p-4">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-[var(--tg-theme-text-color,#000)]">
            Add Copy
          </h2>
          <p className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            {book.title}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <StepIndicator
            step={1}
            current={step === "scan"}
            done={!!scannedQrCode}
            label="Scan QR"
          />
          <div className="h-px flex-1 bg-[var(--tg-theme-section-separator-color,#e0e0e0)]" />
          <StepIndicator
            step={2}
            current={step === "location"}
            done={!!selectedLocation}
            label="Location"
          />
          <div className="h-px flex-1 bg-[var(--tg-theme-section-separator-color,#e0e0e0)]" />
          <StepIndicator
            step={3}
            current={step === "confirm"}
            done={false}
            label="Confirm"
          />
        </div>

        {/* Step content */}
        {step === "scan" && <ScanStep onScan={onScan} />}

        {step === "location" && (
          <LocationStep
            locations={locations}
            scannedQrCode={scannedQrCode}
            onSelectLocation={onSelectLocation}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            book={book}
            scannedQrCode={scannedQrCode!}
            location={selectedLocation!}
            onConfirm={onConfirm}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Spacer for fixed button */}
        <div className="h-20" />
      </div>

      {/* Fixed cancel button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-[var(--tg-theme-bg-color,#fff)] from-60% to-transparent">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-[var(--tg-theme-hint-color,#999)] bg-[var(--tg-theme-section-bg-color,#f4f4f5)] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  current,
  done,
  label,
}: {
  step: number;
  current: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          done
            ? "bg-green-500 text-white"
            : current
              ? "bg-[var(--tg-theme-button-color,#5288c1)] text-white"
              : "bg-[var(--tg-theme-section-bg-color,#f4f4f5)] text-[var(--tg-theme-hint-color,#999)]"
        }`}
      >
        {done ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          step
        )}
      </div>
      <span className="text-xs text-[var(--tg-theme-hint-color,#999)]">
        {label}
      </span>
    </div>
  );
}

function ScanStep({ onScan }: { onScan: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--tg-theme-hint-color, #999)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <rect x="7" y="7" width="10" height="10" rx="1" />
        </svg>
      </div>
      <p className="text-center text-[var(--tg-theme-text-color,#000)]">
        Scan the QR sticker that you'll attach to this book copy
      </p>
      <button
        onClick={onScan}
        className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-[var(--tg-theme-button-text-color,#fff)]"
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
        Open Scanner
      </button>
    </div>
  );
}

function LocationStep({
  locations,
  scannedQrCode,
  onSelectLocation,
}: {
  locations: Location[];
  scannedQrCode?: string;
  onSelectLocation: (location: Location) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Show scanned QR code */}
      {scannedQrCode && (
        <div className="rounded-xl bg-green-50 p-3">
          <p className="text-xs text-green-600">QR Code scanned:</p>
          <p className="font-mono text-sm text-green-800">{scannedQrCode}</p>
        </div>
      )}

      <p className="text-[var(--tg-theme-text-color,#000)]">
        Select where this copy will be located:
      </p>

      <div className="flex flex-col overflow-hidden rounded-2xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)]">
        {locations.map((location, index) => (
          <div key={location.id}>
            {index > 0 && <div className="mx-4 h-px bg-tg-separator" />}
            <button
              onClick={() => onSelectLocation(location)}
              className="flex w-full items-center justify-between p-4 text-left transition-opacity active:opacity-70"
            >
              <span className="font-medium text-[var(--tg-theme-text-color,#000)]">
                {location.name}
              </span>
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
    </div>
  );
}

function ConfirmStep({
  book,
  scannedQrCode,
  location,
  onConfirm,
  isSubmitting,
}: {
  book: Book;
  scannedQrCode: string;
  location: Location;
  onConfirm: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[var(--tg-theme-text-color,#000)]">
        Ready to add this copy?
      </p>

      <div className="rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] p-4">
        <div className="flex justify-between py-2">
          <span className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            Book
          </span>
          <span className="text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
            {book.title}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--tg-theme-section-separator-color,#e0e0e0)] py-2">
          <span className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            QR Code
          </span>
          <span className="text-sm font-mono text-[var(--tg-theme-text-color,#000)]">
            {scannedQrCode}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--tg-theme-section-separator-color,#e0e0e0)] py-2">
          <span className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            Location
          </span>
          <span className="text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
            {location.name}
          </span>
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={isSubmitting}
        className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)] disabled:opacity-50"
        style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
      >
        {isSubmitting ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Adding Copy...
          </>
        ) : (
          "Confirm & Add Copy"
        )}
      </button>
    </div>
  );
}
