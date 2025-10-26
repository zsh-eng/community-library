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
  location: string;
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

/**
 * Format date as dd/mm/yyyy consistently across all environments
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

// ============================================================================
// MESSAGE CONSTANTS
// ============================================================================

const DESCRIPTION_LENGTH_LIMIT = 800;

export const WELCOME_MESSAGE = `📚 Welcome to the Community Library Bot\\!

To *search* for books, you can type the book or author's name:
E\\.g\\. "harry potter"

To *borrow or return* a book, scan the QR code on the physical book

Available commands:
\\/start \\- Start the bot and view this message
\\/mybooks \\- View your currently borrowed books

Visit our website [to view the full catalogue](https://library.zsheng.app)

Scan a QR code on any book to borrow it\\!`;

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

function formatBookDetailsDescription(description: string): string {
  if (description.length <= DESCRIPTION_LENGTH_LIMIT) {
    return description;
  }

  return `${description.substring(0, DESCRIPTION_LENGTH_LIMIT)}...`;
}

/**
 * Format book details message
 */
export function formatBookDetailsMessage(bookDetails: BookDetails): string {
  const copiesText = bookDetails.copies
    .map((copy) => {
      const statusEmoji = copy.isAvailable ? "✅" : "📅";
      const statusText = copy.isAvailable
        ? `Available at ${copy.location}`
        : `Borrowed (due back ${formatDate(new Date(copy.dueDate!))})`;
      return `📖 Copy ${copy.copyNumber}: ${statusEmoji} ${statusText}`;
    })
    .join("\n");

  const plainMessage = `📚 ${bookDetails.title}
by ${bookDetails.author}

${formatBookDetailsDescription(bookDetails.description)}

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
Status: ${isAvailable ? "✅ Available" : "📖 Borrowed by you"}

${isAvailable ? "" : `Once you've returned the book to ${copyDetails.location}, press the button below.`}
`;

  return escapeMarkdown(plainMessage);
}

/**
 * Format book copy borrowed by someone else message
 */
export function formatBookCopyBorrowedMessage(
  copyDetails: BookCopyDetails,
): string {
  const dueDate = formatDate(new Date(copyDetails.currentLoan!.dueDate));

  const plainMessage = `📚 ${copyDetails.book.title}
by ${copyDetails.book.author}

Copy #${copyDetails.copyNumber}
Status: 📅 Currently borrowed

📅 This book is currently borrowed and due on ${dueDate}.`;

  return escapeMarkdown(plainMessage);
}

/**
 * Format borrowed books list message
 */
export function formatMyBooksMessage(activeLoans: LoanDetails[]): string {
  const loanText = activeLoans
    .map((loan, index) => {
      const dueDate = formatDate(new Date(loan.dueDate));
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
  const dueDate = formatDate(new Date(result.loan.dueDate));

  const plainMessage = `✅ Book Borrowed Successfully!

📚 ${result.book.title}
Copy #${result.copyNumber}

📅 Due date: ${dueDate}

Enjoy your reading!
Remember to return it on time.`;

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
