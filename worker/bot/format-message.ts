/**
 * Message formatting utilities for the Telegram bot
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BookDetails {
  title: string;
  author: string;
  description: string;
  availableCopies: number;
  totalCopies: number;
  imageUrl?: string | null;
  copies: Array<{
    copyNumber: number;
    isAvailable: boolean;
    dueDate?: Date | null;
    location: string;
  }>;
}

export interface SearchResult {
  isbn: string | null;
  title: string;
  author: string;
  availableCopies: number;
  totalCopies: number;
}

export interface BookCopyDetails {
  copyNumber: number;
  book: {
    title: string;
    author: string;
    description: string;
    imageUrl?: string | null;
  };
  currentLoan?: {
    telegramUserId: number;
    dueDate: Date;
  } | null;
}

export interface LoanDetails {
  title: string;
  author: string;
  copyNumber: number;
  dueDate: Date;
}

export interface BorrowResult {
  book: {
    title: string;
  };
  copyNumber: number;
  loan: {
    dueDate: Date;
  };
}

export interface ReturnResult {
  book: {
    title: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Escape special characters for Telegram Markdown
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

// ============================================================================
// MESSAGE CONSTANTS
// ============================================================================

export const WELCOME_MESSAGE = `📚 Welcome to the Community Library Bot!

Available commands:
/search <query> - Search for books by title or author
/book <isbn> - View details of a specific book
/borrow <qr_code> - Borrow a book (scan QR code)
/mybooks - View your currently borrowed books

Scan a QR code on any book to borrow it!`;

export const SEARCH_USAGE =
  "Usage: /search <query>\n\nExample: /search piketty";

export const BOOK_USAGE =
  "Usage: /book <isbn> or /book<isbn>\n\nExample: /book 9780674430006";

export const BORROW_USAGE =
  "Usage: /borrow <qr_code_id>\n\nScan the QR code on the physical book to get the ID.";

export const BOOK_NOT_FOUND = "❌ Book not found.";

export const BOOK_COPY_NOT_FOUND =
  "❌ Book copy not found. Please check the QR code.";

export const SEARCH_ERROR =
  "❌ An error occurred while searching. Please try again.";

export const BOOK_DETAILS_ERROR =
  "❌ An error occurred while fetching book details. Please try again.";

export const GENERIC_ERROR = "❌ An error occurred. Please try again.";

export const USER_IDENTIFICATION_ERROR = "❌ Unable to identify user.";

export const NO_BORROWED_BOOKS =
  "📚 You don't have any borrowed books currently.";

export const BORROW_SUCCESS = "✅ Book borrowed successfully!";

export const RETURN_SUCCESS = "✅ Book returned successfully!";

// ============================================================================
// MESSAGE FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format book details message
 */
export function formatBookDetailsMessage(bookDetails: BookDetails): string {
  const copiesText = bookDetails.copies
    .map((copy) => {
      const statusEmoji = copy.isAvailable ? "✅" : "📅";
      const statusText = copy.isAvailable
        ? `Available at ${copy.location}`
        : `Borrowed (due back ${new Date(copy.dueDate!).toLocaleDateString()})`;
      return `📖 Copy ${copy.copyNumber}: ${statusEmoji} ${statusText}`;
    })
    .join("\n");

  const plainMessage = `📚 ${bookDetails.title}
by ${bookDetails.author}

${bookDetails.description}

📊 Availability: ${bookDetails.availableCopies} of ${bookDetails.totalCopies} ${bookDetails.totalCopies === 1 ? "copy" : "copies"} available

Copies:
${copiesText}

💡 To borrow, scan the QR code on the physical book`;

  // Apply formatting after escaping
  const message = escapeMarkdown(plainMessage).replace(
    escapeMarkdown(`📚 ${bookDetails.title}`),
    `📚 *${escapeMarkdown(bookDetails.title)}*`,
  );

  return message;
}

/**
 * Format search results message
 */
export function formatSearchResultsMessage(
  results: SearchResult[],
  query: string,
): string {
  const resultText = results
    .map((book, index) => {
      const availability =
        book.availableCopies > 0
          ? `${book.availableCopies} available`
          : "none available";

      return `${index + 1}\\. 📚 *${escapeMarkdown(book.title)}*
   by ${escapeMarkdown(book.author)}
   ${book.totalCopies} ${book.totalCopies === 1 ? "copy" : "copies"} \\(${availability}\\)
   /book${book.isbn}`;
    })
    .join("\n\n");

  const message = `🔍 Found ${results.length} result${results.length === 1 ? "" : "s"} for "${escapeMarkdown(query)}":\n\n${resultText}`;

  return message;
}

/**
 * Format no search results message
 */
export function formatNoSearchResultsMessage(query: string): string {
  return `🔍 No results found for "${query}"`;
}

/**
 * Format book copy details message (for borrow flow)
 */
export function formatBookCopyDetailsMessage(
  copyDetails: BookCopyDetails,
): string {
  const isAvailable = !copyDetails.currentLoan;
  const plainMessage = `📚 ${copyDetails.book.title}
by ${copyDetails.book.author}

Copy #${copyDetails.copyNumber}

${copyDetails.book.description}

Status: ${isAvailable ? "✅ Available" : "📖 Borrowed by you"}`;

  return escapeMarkdown(plainMessage);
}

/**
 * Format book copy borrowed by someone else message
 */
export function formatBookCopyBorrowedMessage(
  copyDetails: BookCopyDetails,
): string {
  const dueDate = new Date(
    copyDetails.currentLoan!.dueDate,
  ).toLocaleDateString();

  const plainMessage = `📚 ${copyDetails.book.title}
by ${copyDetails.book.author}

Copy #${copyDetails.copyNumber}

${copyDetails.book.description}

Status: 📅 Currently borrowed

📅 This book is currently borrowed and due back on ${dueDate}.`;

  return escapeMarkdown(plainMessage);
}

/**
 * Format borrowed books list message
 */
export function formatMyBooksMessage(activeLoans: LoanDetails[]): string {
  const loanText = activeLoans
    .map((loan, index) => {
      const dueDate = new Date(loan.dueDate).toLocaleDateString();
      const isOverdue = new Date(loan.dueDate) < new Date();
      const overdueIndicator = isOverdue ? " ⚠️ OVERDUE" : "";

      return `${index + 1}. ${loan.title}
   by ${loan.author}
   Copy #${loan.copyNumber}
   Due: ${dueDate}${overdueIndicator}`;
    })
    .join("\n\n");

  const message = escapeMarkdown(
    `📚 Your borrowed books (${activeLoans.length}):\n\n${loanText}\n\n💡 Scan the QR code to return a book`,
  );

  return message;
}

/**
 * Format borrow success message
 */
export function formatBorrowSuccessMessage(result: BorrowResult): string {
  const dueDate = new Date(result.loan.dueDate).toLocaleDateString();

  const plainMessage = `✅ Book Borrowed Successfully!

📚 ${result.book.title}
Copy #${result.copyNumber}

📅 Due date: ${dueDate}

Enjoy your reading! Remember to return it on time.`;

  return escapeMarkdown(plainMessage);
}

/**
 * Format return success message
 */
export function formatReturnSuccessMessage(result: ReturnResult): string {
  const plainMessage = `✅ Book Returned Successfully!

📚 ${result.book.title}

Thank you for returning the book!`;

  return escapeMarkdown(plainMessage);
}
