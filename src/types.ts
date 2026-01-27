export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  imageUrl: string | null;
  description?: string | null;
  createdAt: string;
}

export interface Loan {
  id: number;
  qrCodeId: string;
  telegramUserId: number;
  telegramUsername: string | null;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  lastReminderSent: string | null;
}

export interface Location {
  id: number;
  name: string;
}

export interface BookCopy {
  qrCodeId: string;
  bookId: number;
  copyNumber: number;
  status: string | null;
  loans: Loan[];
  location: Location;
}

export type BookDetail = {
  id: number;
  isbn: string;
  title: string;
  author: string;
  imageUrl: string | null;
  description: string | null;
  createdAt: string;
  bookCopies: BookCopy[];
};
