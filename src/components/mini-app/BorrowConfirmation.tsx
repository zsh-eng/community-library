import type { BorrowRecord } from "@/data/borrow-store.ts";
import confetti from "canvas-confetti";
import { useCallback, useEffect } from "react";

import "./BorrowConfirmation.css";

export function BorrowConfirmation({
  record,
  onDone,
}: {
  record: BorrowRecord;
  onDone: () => void;
}) {
  const dueDateStr = record.dueDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          {record.book.title}
        </p>
      </div>

      {/* Details card */}
      <div className="w-full max-w-sm rounded-xl bg-[var(--tg-theme-section-bg-color,#f4f4f5)] p-4">
        <div className="flex justify-between py-2">
          <span className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            Author
          </span>
          <span className="text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
            {record.book.author}
          </span>
        </div>
        <div className="flex justify-between border-t border-[var(--tg-theme-section-separator-color,#e0e0e0)] py-2">
          <span className="text-sm text-[var(--tg-theme-hint-color,#999)]">
            Location
          </span>
          <span className="text-sm font-medium text-[var(--tg-theme-text-color,#000)]">
            {record.book.location}
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
