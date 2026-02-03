/**
 * Stage 5: Generate Output
 *
 * Generates seed-dev.sql and seed-prod.sql from books_master.csv
 * with deterministic book IDs (sorted by ISBN).
 *
 * Input: output/books_master.csv
 * Output: output/seed-dev.sql, output/seed-prod.sql
 */

import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { readCSV } from "../lib/csv";
import type {
  BookCopy,
  FinalBook,
  MasterBook,
  PipelineConfig,
} from "../lib/types";

// Re-import constants
const LOCATION_MAP_LOCAL: Record<string, number> = {
  saga: 1,
  elm: 2,
  cendana: 3,
};

const IMAGE_CDN_BASE_LOCAL =
  "https://cdn.jsdelivr.net/gh/zsh-eng/community-library-images@main/assets/covers";

/**
 * Generate a random 6-character alphanumeric string (uppercase)
 */
function generateRandomSuffix(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate deterministic QR code for dev (based on book ID)
 */
function generateDevQrCode(bookId: number): string {
  return `COPY-DEV${String(bookId).padStart(3, "0")}`;
}

/**
 * Escape SQL string
 */
function escapeSql(str: string): string {
  if (!str) return "";
  return str.replace(/'/g, "''");
}

/**
 * Assign deterministic IDs to books (sorted by ISBN)
 */
function assignBookIds(books: MasterBook[]): FinalBook[] {
  // Sort by ISBN for deterministic ordering
  const sorted = [...books].sort((a, b) => a.isbn.localeCompare(b.isbn));

  return sorted.map((book, index) => ({
    ...book,
    id: index + 1,
    image_url: `${IMAGE_CDN_BASE_LOCAL}/${book.isbn}.webp`,
  }));
}

/**
 * Generate books SQL insert statement
 */
function generateBooksSql(books: FinalBook[]): string {
  if (books.length === 0) {
    return "-- No books to insert\n";
  }

  const values = books
    .map((book) => {
      const isbn = escapeSql(book.isbn);
      const title = escapeSql(book.title);
      const description = escapeSql(book.description);
      const author = escapeSql(book.author);
      const imageUrl = escapeSql(book.image_url);

      return `  (${book.id}, '${isbn}', '${title}', '${description}', '${author}', '${imageUrl}', strftime('%s', 'now'))`;
    })
    .join(",\n");

  return `-- Insert books (${books.length} unique books by ISBN)
INSERT INTO books (id, isbn, title, description, author, image_url, created_at) VALUES
${values};
`;
}

/**
 * Generate dev copies (1 copy per book for testing)
 */
function generateDevCopies(books: FinalBook[]): BookCopy[] {
  return books.map((book) => ({
    qr_code_id: generateDevQrCode(book.id),
    book_id: book.id,
    copy_number: 1,
    status: "available" as const,
    location_id: LOCATION_MAP_LOCAL[book.location] || 1,
  }));
}

/**
 * Generate copies SQL insert statement
 */
function generateCopiesSql(copies: BookCopy[]): string {
  if (copies.length === 0) {
    return "-- No copies to insert\n";
  }

  const values = copies
    .map((copy) => {
      return `  ('${copy.qr_code_id}', ${copy.book_id}, ${copy.copy_number}, '${copy.status}', ${copy.location_id})`;
    })
    .join(",\n");

  return `-- Insert book copies (${copies.length} copies for development/testing)
INSERT INTO book_copies (qr_code_id, book_id, copy_number, status, location_id) VALUES
${values};
`;
}

/**
 * Generate seed-dev.sql (books + 1 copy per book)
 */
function generateDevSql(books: FinalBook[]): string {
  const copies = generateDevCopies(books);

  return `-- Seed data for community library database (DEVELOPMENT)
-- Generated: ${new Date().toISOString()}
-- Books: ${books.length} unique by ISBN
-- Copies: ${copies.length} (1 copy per book for testing)
--
-- This file includes test copies with deterministic QR codes (COPY-DEV001, etc.)
-- Use for local development and testing.
--
-- To apply:
--   pnpm dlx wrangler d1 execute community-library-db --local --file=./output/seed-dev.sql

${generateBooksSql(books)}

${generateCopiesSql(copies)}

-- Reset sequences (SQLite auto-increment)
-- Note: SQLite handles this automatically, but we set explicit IDs for reproducibility
`;
}

/**
 * Generate seed-prod.sql (books only, no copies)
 */
function generateProdSql(books: FinalBook[]): string {
  return `-- Seed data for community library database (PRODUCTION)
-- Generated: ${new Date().toISOString()}
-- Books: ${books.length} unique by ISBN
-- Copies: 0 (copies are linked via admin interface by scanning pre-printed QR stickers)
--
-- This file contains BOOKS ONLY. Book copies are created when:
-- 1. Pre-printed QR stickers (COPY-XXXXXX) are physically placed on books
-- 2. Admin scans QR code while viewing a book in the miniapp
-- 3. This creates the book_copies record linking QR code to book
--
-- To apply:
--   pnpm dlx wrangler d1 execute community-library-db --remote --file=./output/seed-prod.sql

${generateBooksSql(books)}

-- No book_copies inserted - these are linked via admin interface
`;
}

/**
 * Main generate output function
 */
export async function generateOutput(config: PipelineConfig): Promise<void> {
  console.log("=== Stage 5: Generate Output ===");

  // Load master CSV
  const masterCsvPath = join(config.outputPath, "books_master.csv");
  if (!existsSync(masterCsvPath)) {
    console.log("No books_master.csv found. Run 03-deduplicate.ts first.");
    return;
  }

  const rows = await readCSV<Record<string, string>>(masterCsvPath);
  const books: MasterBook[] = rows.map((row) => ({
    isbn: row.isbn || "",
    title: row.title || "",
    author: row.author || "",
    description: row.description || "",
    first_seen_batch: row.first_seen_batch || "",
    image_source: row.image_source || "",
    location: row.location || "",
  }));

  console.log(`Loaded ${books.length} books from master CSV`);

  // Assign deterministic IDs
  const finalBooks = assignBookIds(books);
  console.log(`Assigned IDs 1-${finalBooks.length} (sorted by ISBN)`);

  // Ensure output directory exists
  await mkdir(config.outputPath, { recursive: true });

  // Generate dev SQL
  const devSqlPath = join(config.outputPath, "seed-dev.sql");
  const devSql = generateDevSql(finalBooks);
  await writeFile(devSqlPath, devSql, "utf-8");
  console.log(`\nWrote ${devSqlPath}`);
  console.log(`  - ${finalBooks.length} books`);
  console.log(`  - ${finalBooks.length} copies (1 per book for testing)`);

  // Generate prod SQL
  const prodSqlPath = join(config.outputPath, "seed-prod.sql");
  const prodSql = generateProdSql(finalBooks);
  await writeFile(prodSqlPath, prodSql, "utf-8");
  console.log(`\nWrote ${prodSqlPath}`);
  console.log(`  - ${finalBooks.length} books`);
  console.log(`  - 0 copies (linked via admin interface)`);

  console.log(`\n✅ Output generation complete`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review: open ${devSqlPath}`);
  console.log(
    `  2. Local:  pnpm dlx wrangler d1 execute community-library-db --local --file=./output/seed-dev.sql`,
  );
  console.log(
    `  3. Prod:   pnpm dlx wrangler d1 execute community-library-db --remote --file=./output/seed-prod.sql`,
  );
}

// Run directly
if (import.meta.main) {
  const outputPath = join(process.cwd(), "output");

  generateOutput({
    rawDataPath: "",
    outputPath,
    imageOutputPath: join(outputPath, "images"),
  }).catch(console.error);
}
