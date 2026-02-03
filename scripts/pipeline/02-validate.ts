/**
 * Stage 2: Validate
 *
 * Validates and normalizes ISBNs. Optionally enriches from Google Books API.
 *
 * Input: output/{location}/{batch}/books_raw.csv
 * Output: output/{location}/{batch}/books_validated.csv
 */

import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { readCSV, writeCSV } from "../lib/csv";
import { looksLikeISBN, normalizeISBN } from "../lib/isbn";
import type {
  ExtractedBook,
  PipelineConfig,
  ValidatedBook,
} from "../lib/types";

/**
 * Find all books_raw.csv files in the output directory
 */
function findRawCSVFiles(outputPath: string): string[] {
  const files: string[] = [];
  const locations = ["cendana", "elm", "saga"];

  for (const location of locations) {
    const locationPath = join(outputPath, location);
    if (!existsSync(locationPath)) {
      continue;
    }

    const batches = readdirSync(locationPath, { withFileTypes: true });
    for (const batch of batches) {
      if (batch.isDirectory()) {
        const csvPath = join(locationPath, batch.name, "books_raw.csv");
        if (existsSync(csvPath)) {
          files.push(csvPath);
        }
      }
    }
  }

  return files;
}

/**
 * Validate a single book entry
 */
function validateBook(book: ExtractedBook): ValidatedBook {
  let normalizedIsbn = "";
  let isbnValid = false;

  if (
    book.isbn &&
    book.isbn.trim() !== "" &&
    book.isbn.toUpperCase() !== "INVALID"
  ) {
    // Check if it looks like an ISBN
    if (looksLikeISBN(book.isbn)) {
      const normalized = normalizeISBN(book.isbn);
      if (normalized) {
        normalizedIsbn = normalized;
        isbnValid = true;
      }
    }
  }

  // Update review reason if ISBN is invalid
  let reviewReason = book.review_reason;
  let needsReview = book.needs_review;

  if (!isbnValid && book.isbn && book.isbn.trim() !== "") {
    needsReview = true;
    reviewReason = reviewReason
      ? `${reviewReason}; Invalid ISBN format`
      : "Invalid ISBN format";
  }

  return {
    ...book,
    normalized_isbn: normalizedIsbn,
    isbn_valid: isbnValid,
    needs_review: needsReview,
    review_reason: reviewReason,
  };
}

/**
 * Process a single CSV file
 */
async function validateCSV(csvPath: string): Promise<ValidatedBook[]> {
  console.log(`\nValidating ${csvPath}...`);

  const rawBooks = await readCSV<Record<string, string>>(csvPath);
  console.log(`  Read ${rawBooks.length} entries`);

  const validatedBooks: ValidatedBook[] = [];

  for (const row of rawBooks) {
    const book: ExtractedBook = {
      scan_index: parseInt(row.scan_index) || 0,
      isbn: row.isbn || "",
      title: row.title || "",
      author: row.author || "",
      description: row.description || "",
      image_file: row.image_file || "",
      needs_review: row.needs_review === "true",
      review_reason: row.review_reason || "",
      batch: row.batch || "",
      location: row.location || "",
    };

    const validated = validateBook(book);
    validatedBooks.push(validated);
  }

  // Write validated CSV (same directory, different name)
  const outputPath = csvPath.replace("books_raw.csv", "books_validated.csv");
  await writeCSV(outputPath, validatedBooks, [
    "scan_index",
    "isbn",
    "normalized_isbn",
    "isbn_valid",
    "title",
    "author",
    "description",
    "image_file",
    "needs_review",
    "review_reason",
    "batch",
    "location",
  ]);

  const validCount = validatedBooks.filter((b) => b.isbn_valid).length;
  const invalidCount = validatedBooks.length - validCount;

  console.log(`  ✅ ${validCount} valid ISBNs`);
  if (invalidCount > 0) {
    console.log(`  ⚠️  ${invalidCount} invalid/missing ISBNs`);
  }
  console.log(`  Wrote to ${outputPath}`);

  return validatedBooks;
}

/**
 * Main validate function
 */
export async function validate(
  config: PipelineConfig,
): Promise<ValidatedBook[]> {
  console.log("=== Stage 2: Validate ===");

  const csvFiles = findRawCSVFiles(config.outputPath);
  console.log(`Found ${csvFiles.length} CSV files to validate`);

  if (csvFiles.length === 0) {
    console.log("No books_raw.csv files found. Run 01-extract.ts first.");
    return [];
  }

  const allBooks: ValidatedBook[] = [];

  for (const csvPath of csvFiles) {
    const books = await validateCSV(csvPath);
    allBooks.push(...books);
  }

  const totalValid = allBooks.filter((b) => b.isbn_valid).length;
  const totalInvalid = allBooks.length - totalValid;

  console.log(`\n✅ Validation complete:`);
  console.log(`   Total entries: ${allBooks.length}`);
  console.log(`   Valid ISBNs: ${totalValid}`);
  console.log(`   Invalid/missing: ${totalInvalid}`);

  return allBooks;
}

// Run directly
if (import.meta.main) {
  const outputPath = join(process.cwd(), "output");

  validate({
    rawDataPath: "",
    outputPath,
    imageOutputPath: join(outputPath, "images"),
  }).catch(console.error);
}
