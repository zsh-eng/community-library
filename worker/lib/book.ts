import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { bookCopies, books, loans } from "../db/schema";

// Type for database with schema
export type Database = DrizzleD1Database<typeof schema>;

// ============================================================================
// BACKEND FUNCTIONS
// ============================================================================

/**
 * Get book copy details with joined book info and current loan status
 * Used by /borrow command
 */
export async function getBookCopyDetails(db: Database, qrCodeId: string) {
  const bookCopy = await db.query.bookCopies.findFirst({
    where: eq(bookCopies.qrCodeId, qrCodeId),
    with: {
      book: true,
      loans: {
        where: isNull(loans.returnedAt),
        limit: 1,
      },
    },
  });

  if (!bookCopy) {
    return null;
  }

  return {
    qrCodeId: bookCopy.qrCodeId,
    copyNumber: bookCopy.copyNumber,
    status: bookCopy.status,
    book: bookCopy.book,
    currentLoan: bookCopy.loans[0] || null,
  };
}

/**
 * Get book details by ISBN with all copies and their availability
 * Used by /book command
 */
export async function getBookDetails(db: Database, isbn: string) {
  const book = await db.query.books.findFirst({
    where: eq(books.isbn, isbn),
    with: {
      bookCopies: {
        with: {
          loans: {
            where: isNull(loans.returnedAt),
            limit: 1,
          },
          location: true,
        },
      },
    },
  });

  if (!book) {
    return null;
  }

  // Calculate availability summary
  const totalCopies = book.bookCopies.length;
  const availableCopies = book.bookCopies.filter(
    (copy) => copy.status === "available" && copy.loans.length === 0,
  ).length;

  // Map copies with their loan info (but don't expose QR codes)
  const copiesInfo = book.bookCopies.map((copy) => ({
    copyNumber: copy.copyNumber,
    status: copy.status,
    isAvailable: copy.status === "available" && copy.loans.length === 0,
    dueDate: copy.loans[0]?.dueDate || null,
    location: copy.location.name,
  }));

  return {
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    description: book.description,
    imageUrl: book.imageUrl,
    totalCopies,
    availableCopies,
    copies: copiesInfo,
  };
}

/**
 * Borrow a book copy
 * Handles concurrency checks and loan creation
 *
 * NOTE: Cloudflare D1 does not support SQL transaction syntax (BEGIN TRANSACTION, SAVEPOINT).
 * Instead, we rely on a unique partial index on (qrCodeId, returnedAt) WHERE returnedAt IS NULL
 * to ensure that only one active loan can exist per book copy. If two users try to borrow
 * simultaneously, the database constraint will cause one insert to fail, preventing race conditions.
 */
export async function borrowBook(
  db: Database,
  qrCodeId: string,
  telegramUserId: number,
  telegramUsername: string | undefined,
) {
  // 1. Verify book copy exists and is available
  const bookCopy = await db.query.bookCopies.findFirst({
    where: eq(bookCopies.qrCodeId, qrCodeId),
    with: {
      book: true,
      loans: {
        where: isNull(loans.returnedAt),
        limit: 1,
      },
    },
  });

  if (!bookCopy) {
    return { success: false, error: "Book copy not found" };
  }

  if (bookCopy.loans.length > 0) {
    const currentLoan = bookCopy.loans[0];
    if (currentLoan.telegramUserId === telegramUserId) {
      return { success: false, error: "You have already borrowed this book" };
    }
    return {
      success: false,
      error: `This book is currently borrowed (due back ${new Date(currentLoan.dueDate).toLocaleDateString()})`,
    };
  }

  // 2. Create loan record with concurrency protection via unique constraint
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14); // 2-week loan period

  try {
    const [loan] = await db
      .insert(loans)
      .values({
        qrCodeId,
        telegramUserId,
        telegramUsername: telegramUsername || null,
        borrowedAt: new Date(),
        dueDate,
      })
      .returning();

    return {
      success: true,
      loan,
      book: bookCopy.book,
      copyNumber: bookCopy.copyNumber,
    };
  } catch (error) {
    // If unique constraint fails, someone borrowed it between our check and insert
    console.error(error);
    return {
      success: false,
      error: "This book was just borrowed by someone else. Please try again.",
    };
  }
}

/**
 * Return a book copy
 * Validates the user has an active loan for this book
 *
 * NOTE: See borrowBook() for explanation of D1 transaction limitations.
 * We use conditional updates to ensure safe concurrent operations.
 */
export async function returnBook(
  db: Database,
  qrCodeId: string,
  telegramUserId: number,
) {
  const returnedAt = new Date();

  // Conditional update: only update if returnedAt IS NULL
  const result = await db
    .update(loans)
    .set({ returnedAt })
    .where(
      and(
        eq(loans.qrCodeId, qrCodeId),
        eq(loans.telegramUserId, telegramUserId),
        isNull(loans.returnedAt),
      ),
    )
    .returning();

  if (result.length === 0) {
    return { success: false, error: "No active loan found for this book" };
  }

  const [updatedLoan] = result;

  // Fetch book details
  const bookCopy = await db.query.bookCopies.findFirst({
    where: eq(bookCopies.qrCodeId, qrCodeId),
    with: {
      book: true,
    },
  });

  return {
    success: true,
    book: bookCopy!.book,
    borrowedAt: updatedLoan.borrowedAt,
    returnedAt,
  };
}

/**
 * Search books by title or author
 * Returns books with availability info
 */
export async function searchBooks(
  db: Database,
  query: string,
  limit: number = 10,
) {
  const searchPattern = `%${query}%`;

  const results = await db.query.books.findMany({
    where: or(
      like(books.title, searchPattern),
      like(books.author, searchPattern),
    ),
    limit,
    with: {
      bookCopies: {
        with: {
          loans: {
            where: isNull(loans.returnedAt),
            limit: 1,
          },
        },
      },
    },
  });

  // Transform results to include availability
  return results.map((book) => {
    const totalCopies = book.bookCopies.length;
    const availableCopies = book.bookCopies.filter(
      (copy) => copy.status === "available" && copy.loans.length === 0,
    ).length;

    return {
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      imageUrl: book.imageUrl,
      totalCopies,
      availableCopies,
    };
  });
}

/**
 * Get all active loans for a user
 * Used by /mybooks command
 */
export async function getUserActiveLoans(db: Database, telegramUserId: number) {
  const activeLoans = await db.query.loans.findMany({
    where: and(
      eq(loans.telegramUserId, telegramUserId),
      isNull(loans.returnedAt),
    ),
    with: {
      bookCopy: {
        with: {
          book: true,
        },
      },
    },
    orderBy: [desc(loans.borrowedAt)],
  });

  return activeLoans.map((loan) => ({
    qrCodeId: loan.qrCodeId,
    title: loan.bookCopy.book.title,
    author: loan.bookCopy.book.author,
    copyNumber: loan.bookCopy.copyNumber,
    borrowedAt: loan.borrowedAt,
    dueDate: loan.dueDate,
  }));
}
