import type { ReturnResult } from "@/hooks/use-return-book";
import confetti from "canvas-confetti";
import { useCallback, useEffect, useState } from "react";

import "./BorrowConfirmation.css";

export function ReturnConfirmation({
    result,
    onDone,
}: {
    result: ReturnResult;
    onDone: () => void;
}) {
    // ===== TEMPORARY: Animation key to retrigger animation on tap =====
    const [animationKey, setAnimationKey] = useState(0);
    const handleRetrigger = useCallback(() => {
        setAnimationKey((k) => k + 1);
    }, []);
    // ===== END TEMPORARY =====

    const fireConfetti = useCallback(() => {
        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#22c55e", "#4ade80", "#86efac", "#fbbf24", "#60a5fa"],
        });
    }, []);

    // Fire confetti after checkmark animation completes
    useEffect(() => {
        const timer = setTimeout(() => {
            fireConfetti();
        }, 1000); // 650ms for animation + 350ms pause

        return () => clearTimeout(timer);
    }, [animationKey, fireConfetti]);

    return (
        // ===== TEMPORARY: onClick to retrigger animation =====
        <div
            key={animationKey}
            onClick={handleRetrigger}
            className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--tg-theme-bg-color,#fff)] p-6"
        >
            {/* Animated Checkmark - stays visible (no phase 2 transition) */}
            <div className="checkmark-container-static">
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
                    Book Returned!
                </h2>
                <p className="text-[var(--tg-theme-hint-color,#999)]">
                    Thank you for returning
                </p>
                <p className="font-semibold text-[var(--tg-theme-text-color,#000)]">
                    {result.book?.title ?? "Unknown Book"}
                </p>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent retrigger when clicking button
                    onDone();
                }}
                className="mt-2 w-full max-w-sm rounded-xl py-3.5 font-medium text-[var(--tg-theme-button-text-color,#fff)]"
                style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
            >
                Done
            </button>
        </div>
    );
}
