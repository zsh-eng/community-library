import { useState } from "react";
import type { BookCopy, BookDetail } from "@/types";
import type { BorrowRecord } from "@/data/borrow-store";
import {
  borrowBook,
  getChangeId,
  getMyBorrows,
  isBookCopyBorrowed,
} from "@/data/borrow-store";

export function useBorrowStore(userId: number) {
  const [, setVersion] = useState(() => getChangeId());

  function borrow(book: BookDetail, copy: BookCopy): BorrowRecord {
    const record = borrowBook(book, copy, userId);
    setVersion(getChangeId());
    return record;
  }

  function myBorrows(): BorrowRecord[] {
    return getMyBorrows(userId);
  }

  function isBorrowed(qrCodeId: string): boolean {
    return isBookCopyBorrowed(qrCodeId);
  }

  return { borrow, myBorrows, isBorrowed };
}
