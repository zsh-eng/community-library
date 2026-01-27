import type { Book } from "./books.ts";

export type BorrowRecord = {
  book: Book;
  borrowedAt: Date;
  dueDate: Date;
  userId: number;
};

const records: Map<string, BorrowRecord> = new Map();
let changeId = 0;

export function borrowBook(book: Book, userId: number): BorrowRecord {
  const borrowedAt = new Date();
  const dueDate = new Date(borrowedAt);
  dueDate.setDate(dueDate.getDate() + 14); // 2-week loan

  const record: BorrowRecord = { book, borrowedAt, dueDate, userId };
  records.set(book.id, record);
  changeId++;
  return record;
}

export function getMyBorrows(userId: number): BorrowRecord[] {
  return [...records.values()].filter((r) => r.userId === userId);
}

export function isBookBorrowed(bookId: string): boolean {
  return records.has(bookId);
}

export function getChangeId(): number {
  return changeId;
}
