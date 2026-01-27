import type { BorrowResult } from "@/hooks/use-borrow-book";
import type { BookCopy } from "@/types";
import confetti from "canvas-confetti";
import { useCallback, useEffect, useState } from "react";

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
  // ===== TEMPORARY: Animation key to retrigger animation on tap =====
  const [animationKey, setAnimationKey] = useState(0);
  const handleRetrigger = useCallback(() => {
    setAnimationKey((k) => k + 1);
  }, []);
  // ===== END TEMPORARY =====

  const [phase, setPhase] = useState<1 | 2>(1);

  const dueDateStr = result.loan
    ? new Date(result.loan.dueDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#4ade80", "#86efac", "#fbbf24", "#60a5fa"],
    });
  }, []);

  // Reset phase when animation key changes (for retrigger)
  useEffect(() => {
    setPhase(1);
  }, [animationKey]);

  // Transition to phase 2 after checkmark animation completes + slight pause
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase(2);
      fireConfetti();
    }, 1000); // 650ms for animation + 350ms pause

    return () => clearTimeout(timer);
  }, [animationKey, fireConfetti]);

  // Get book cover from copy's book data if available
  // Note: copy doesn't include imageUrl in types, we may need to get it from result or pass it from parent
  // For now, we'll use a fallback since BorrowResult.book doesn't have imageUrl

  return (
    // ===== TEMPORARY: onClick to retrigger animation =====
    <div
      key={animationKey}
      onClick={handleRetrigger}
      className={`flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--tg-theme-bg-color,#fff)] p-6 ${phase === 2 ? "phase2" : ""}`}
    >
      {/* Hero container - fixed size to prevent layout shift */}
      <div className="hero-container">
        {/* Animated Checkmark - fades out in phase 2 */}
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

        {/* Book Cover - fades in during phase 2 */}
        <div className="book-cover-container">
          {result.book?.imageUrl ? (
            <img
              src={result.book.imageUrl}
              alt={`${result.book.title} cover`}
              className="book-cover-image"
            />
          ) : (
            <div className="book-cover-fallback">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
          )}
        </div>
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
            {copy.copyNumber}
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
        onClick={(e) => {
          e.stopPropagation(); // Prevent retrigger when clicking button
          onDone();
        }}
        className="mt-2 w-full max-w-sm rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)]"
        style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
      >
        Back to Home
      </button>
    </div>
  );
}
