import { useState } from "react";
import type { Book } from "../data/books.ts";
import type { BorrowRecord } from "../data/borrow-store.ts";
import {
  borrowBook,
  getChangeId,
  getMyBorrows,
  isBookBorrowed,
} from "../data/borrow-store.ts";

export function useBorrowStore(userId: number) {
  const [, setVersion] = useState(() => getChangeId());

  function borrow(book: Book): BorrowRecord {
    const record = borrowBook(book, userId);
    setVersion(getChangeId());
    return record;
  }

  function myBorrows(): BorrowRecord[] {
    return getMyBorrows(userId);
  }

  function isBorrowed(bookId: string): boolean {
    return isBookBorrowed(bookId);
  }

  return { borrow, myBorrows, isBorrowed };
}
