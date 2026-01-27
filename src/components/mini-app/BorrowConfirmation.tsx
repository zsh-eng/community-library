import type { BorrowResult } from "@/hooks/use-borrow-book";
import type { BookCopy } from "@/types";
import confetti from "canvas-confetti";
import { useCallback, useEffect } from "react";

import "./BorrowConfirmation.css";

export function BorrowConfirmation({
  result,
  copy,
  onDone,
}: {
  result: BorrowResult;
  copy: BookCopy;
  onDone: () => void;
}) {
  const dueDateStr = result.loan
    ? new Date(result.loan.dueDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#4ade80", "#86efac", "#fbbf24", "#60a5fa"],
    });
  }, []);

  // Fire confetti on mount
  useEffect(() => {
    fireConfetti();
  }, [fireConfetti]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--tg-theme-bg-color,#fff)] p-6">
      {/* Animated Checkmark */}
      <div className="checkmark-container">
        <svg
          className="checkmark-svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 52 52"
        >
          <circle
            className="checkmark-circle"
            cx="26"
            cy="26"
            r="24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
          />
          <path
            className="checkmark-check"
            fill="none"
            stroke="#22c55e"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 26l7 7 15-15"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-xl font-bold text-[var(--tg-theme-text-color,#000)]">
          Book Borrowed!
        </h2>
        <p className="text-[var(--tg-theme-hint-color,#999)]">
          You have successfully borrowed
        </p>
        <p className="font-semibold text-[var(--tg-theme-text-color,#000)]">
          {result.book?.title ?? "Unknown Book"}
        </p>
      </div>

      {/* Details card */}
      <div className="w-full max-w-sm rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] p-4">
        <div className="flex justify-between py-2">
          <span className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            Author
          </span>
          <span className="text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
            {result.book?.author ?? "Unknown"}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--tg-theme-section-separator-color,#e0e0e0)] py-2">
          <span className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            Location
          </span>
          <span className="text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
            {copy.location.name}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--tg-theme-section-separator-color,#e0e0e0)] py-2">
          <span className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            Copy #
          </span>
          <span className="text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
            {result.copyNumber ?? copy.copyNumber}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--tg-theme-section-separator-color,#e0e0e0)] py-2">
          <span className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            Due Date
          </span>
          <span className="text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
            {dueDateStr}
          </span>
        </div>
      </div>

      <button
        onClick={onDone}
        className="mt-2 w-full max-w-sm rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)]"
        style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
      >
        Back to Home
      </button>
    </div>
  );
}
