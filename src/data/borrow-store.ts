import type { BookCopy, BookDetail } from "@/types";

export type BorrowRecord = {
  book: BookDetail;
  copy: BookCopy;
  borrowedAt: Date;
  dueDate: Date;
  userId: number;
};

// In-memory store for borrowed books (client-side only for Phase 1)
const records: Map<string, BorrowRecord> = new Map();
let changeId = 0;

/**
 * Record a book copy as borrowed by a user.
 * Tracked by qrCodeId since each copy has a unique QR code.
 */
export function borrowBook(
  book: BookDetail,
  copy: BookCopy,
  userId: number,
): BorrowRecord {
  const borrowedAt = new Date();
  const dueDate = new Date(borrowedAt);
  dueDate.setDate(dueDate.getDate() + 14); // 2-week loan

  const record: BorrowRecord = { book, copy, borrowedAt, dueDate, userId };
  records.set(copy.qrCodeId, record);
  changeId++;
  return record;
}

/**
 * Get all borrow records for a specific user.
 */
export function getMyBorrows(userId: number): BorrowRecord[] {
  return [...records.values()].filter((r) => r.userId === userId);
}

/**
 * Check if a specific book copy is currently borrowed (by anyone).
 */
export function isBookCopyBorrowed(qrCodeId: string): boolean {
  return records.has(qrCodeId);
}

/**
 * Get the current change ID (for triggering React re-renders).
 */
export function getChangeId(): number {
  return changeId;
}
