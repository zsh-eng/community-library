import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface Book {
  isbn: string;
  title: string;
  author: string;
  description: string;
  image_url: string;
}

interface Copy {
  qrCodeId: string;
  bookId: number;
  copyNumber: number;
  status: "available" | "borrowed";
  locationId: number;
}

interface Loan {
  id: number;
  qrCodeId: string;
  telegramUserId: number;
  telegramUsername: string;
  borrowedAt: string;
  dueDate: string; // Always set - typically 14 days after borrowedAt
  returnedAt: string | null; // NULL for outstanding loans
  lastReminderSent: string | null; // NULL for returned loans
}

// Sample usernames for loan generation
const SAMPLE_USERNAMES = [
  "alice_reader",
  "bob_bookworm",
  "charlie_student",
  "dana_scholar",
  "eve_writer",
  "frank_teacher",
  "grace_librarian",
  "henry_professor",
  "iris_researcher",
  "jack_enthusiast",
  "kate_learner",
  "leo_academic",
  "maya_thinker",
  "noah_collector",
  "olivia_curator",
];

// Helper to get random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to get random element from array
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate a random telegram user ID
function randomUserId(): number {
  return randomInt(100000000, 999999999);
}

// Generate QR code ID for a book copy
function generateQrCodeId(bookId: number, copyNumber: number): string {
  return `BOOK-${String(bookId).padStart(3, "0")}-COPY-${copyNumber}`;
}

// Read and parse JSONL file
function readBooksData(filePath: string): Book[] {
  const content = readFileSync(filePath, "utf-8");
  return content
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

// Generate SQL for books
function generateBooksSql(books: Book[]): string {
  const values = books
    .map((book, index) => {
      const id = index + 1;
      const isbn = book.isbn.replace(/'/g, "''");
      const title = book.title.replace(/'/g, "''");
      const description = book.description.replace(/'/g, "''");
      const author = book.author.replace(/'/g, "''");
      const imageUrl = book.image_url.replace(/'/g, "''");

      return `  (${id}, '${isbn}', '${title}', '${description}', '${author}', '${imageUrl}', strftime('%s', 'now'))`;
    })
    .join(",\n");

  return `-- Insert books\nINSERT INTO books (id, isbn, title, description, author, image_url, created_at) VALUES\n${values};\n`;
}

// Generate copies for all books
function generateCopies(bookCount: number): Copy[] {
  const copies: Copy[] = [];

  for (let bookId = 1; bookId <= bookCount; bookId++) {
    // Weighted random number of copies: 70% 1 copy, 20% 2 copies, 10% 3 copies
    const rand = Math.random();
    let numCopies: number;
    if (rand < 0.7) {
      numCopies = 1;
    } else if (rand < 0.9) {
      numCopies = 2;
    } else {
      numCopies = 3;
    }

    for (let copyNum = 1; copyNum <= numCopies; copyNum++) {
      const qrCodeId = generateQrCodeId(bookId, copyNum);
      // Last copy of each book might be borrowed
      const status =
        copyNum === numCopies && Math.random() > 0.5 ? "borrowed" : "available";
      // Random location: 1 (Saga), 2 (Elm), or 3 (Cendana)
      const locationId = randomInt(1, 3);

      copies.push({
        qrCodeId,
        bookId,
        copyNumber: copyNum,
        status,
        locationId,
      });
    }
  }

  return copies;
}

// Generate SQL for copies
function generateCopiesSql(copies: Copy[]): string {
  const values = copies
    .map((copy) => {
      return `  ('${copy.qrCodeId}', ${copy.bookId}, ${copy.copyNumber}, '${copy.status}', ${copy.locationId})`;
    })
    .join(",\n");

  return `-- Insert book copies\nINSERT INTO book_copies (qr_code_id, book_id, copy_number, status, location_id) VALUES\n${values};\n`;
}

// Generate loans for copies
function generateLoans(copies: Copy[]): Loan[] {
  const loans: Loan[] = [];
  let loanId = 1;
  const usedUsernames = new Set<string>();

  for (const copy of copies) {
    const numLoans = randomInt(0, 4);

    for (let i = 0; i < numLoans; i++) {
      const isLastLoan = i === numLoans - 1;
      const isOutstanding = isLastLoan && copy.status === "borrowed";

      // Get unique username
      let username: string;
      do {
        username = randomElement(SAMPLE_USERNAMES);
      } while (
        usedUsernames.has(`${copy.qrCodeId}-${username}`) &&
        usedUsernames.size < SAMPLE_USERNAMES.length
      );
      usedUsernames.add(`${copy.qrCodeId}-${username}`);

      const userId = randomUserId();

      // Generate dates based on loan position
      // Older loans are further in the past
      const daysAgoBorrowed = isLastLoan
        ? randomInt(5, 15)
        : randomInt(20 + i * 15, 60 + i * 15);
      const daysAgoReturned = isLastLoan
        ? randomInt(3, daysAgoBorrowed - 2)
        : randomInt(2, daysAgoBorrowed - 15);

      // borrowedAt: when the book was borrowed (in the past)
      const borrowedAt = `strftime('%s', 'now', '-${daysAgoBorrowed} days')`;

      // dueDate: ALWAYS set to 14 days after borrowedAt (never NULL)
      // Calculate days from now: if borrowed 10 days ago, due date is 10-14 = -4 days ago (4 days in future)
      const daysFromNowToDue = daysAgoBorrowed - 14;
      const dueDate =
        daysFromNowToDue >= 0
          ? `strftime('%s', 'now', '-${daysFromNowToDue} days')`
          : `strftime('%s', 'now', '+${Math.abs(daysFromNowToDue)} days')`;

      // returnedAt: NULL for outstanding loans, otherwise when the book was returned
      const returnedAt = isOutstanding
        ? "NULL"
        : `strftime('%s', 'now', '-${daysAgoReturned} days')`;

      // lastReminderSent: NULL for returned loans, otherwise when last reminder was sent
      const lastReminderSent = isOutstanding
        ? `strftime('%s', 'now', '-${randomInt(1, 3)} days')`
        : "NULL";

      loans.push({
        id: loanId++,
        qrCodeId: copy.qrCodeId,
        telegramUserId: userId,
        telegramUsername: username,
        borrowedAt,
        dueDate,
        returnedAt,
        lastReminderSent,
      });
    }
  }

  return loans;
}

// Generate SQL for loans
function generateLoansSql(loans: Loan[]): string {
  if (loans.length === 0) {
    return "-- No loans to insert\n";
  }

  const values = loans
    .map((loan) => {
      return `  (${loan.id}, '${loan.qrCodeId}', ${loan.telegramUserId}, '${loan.telegramUsername}', ${loan.borrowedAt}, ${loan.dueDate}, ${loan.returnedAt}, ${loan.lastReminderSent})`;
    })
    .join(",\n");

  return `-- Insert loan history\nINSERT INTO loans (id, qr_code_id, telegram_user_id, telegram_username, borrowed_at, due_date, returned_at, last_reminder_sent) VALUES\n${values};\n`;
}

// Main function
function main() {
  const scriptsDir = join(process.cwd(), "scripts");
  const inputFile = join(scriptsDir, "books_seed_data.jsonl");
  const outputFile = join(scriptsDir, "new-seed.sql");

  console.log("Reading books data...");
  const books = readBooksData(inputFile);
  console.log(`Found ${books.length} books`);

  console.log("Generating copies...");
  const copies = generateCopies(books.length);
  console.log(`Generated ${copies.length} copies`);

  console.log("Generating loans...");
  const loans = generateLoans(copies);
  console.log(`Generated ${loans.length} loans`);

  console.log("Building SQL...");
  const sql = [
    "-- Seed data for community library database",
    "-- This script creates sample data for testing and development",
    "-- Generated from books_seed_data.jsonl\n",
    generateBooksSql(books),
    generateCopiesSql(copies),
    generateLoansSql(loans),
  ].join("\n");

  console.log(`Writing to ${outputFile}...`);
  writeFileSync(outputFile, sql);
  console.log("Done!");
  console.log(`\nSummary:`);
  console.log(`- Books: ${books.length}`);
  console.log(`- Copies: ${copies.length}`);
  console.log(`- Loans: ${loans.length}`);
  console.log(
    `- Outstanding loans: ${loans.filter((l) => l.returnedAt === "NULL").length}`,
  );
}

main();
