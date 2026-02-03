/**
 * Stage 3: Deduplicate
 *
 * Merges all validated books across batches by ISBN.
 * One row per unique ISBN, using first occurrence for metadata.
 *
 * Input: All output/{location}/{batch}/books_validated.csv files
 * Output: output/books_master.csv
 */

import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { readCSV, writeCSV } from "../lib/csv";
import type { MasterBook, PipelineConfig, ValidatedBook } from "../lib/types";

/**
 * Find all books_validated.csv files in the output directory
 */
function findValidatedCSVFiles(outputPath: string): string[] {
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
        const csvPath = join(locationPath, batch.name, "books_validated.csv");
        if (existsSync(csvPath)) {
          files.push(csvPath);
        }
      }
    }
  }

  // Sort to ensure deterministic processing order
  files.sort();
  return files;
}

/**
 * Load a validated CSV file
 */
async function loadValidatedCSV(csvPath: string): Promise<ValidatedBook[]> {
  const rows = await readCSV<Record<string, string>>(csvPath);

  return rows.map((row) => ({
    scan_index: parseInt(row.scan_index) || 0,
    isbn: row.isbn || "",
    normalized_isbn: row.normalized_isbn || "",
    isbn_valid: row.isbn_valid === "true",
    title: row.title || "",
    author: row.author || "",
    description: row.description || "",
    image_file: row.image_file || "",
    needs_review: row.needs_review === "true",
    review_reason: row.review_reason || "",
    batch: row.batch || "",
    location: row.location || "",
  }));
}

/**
 * Main deduplicate function
 */
export async function deduplicate(
  config: PipelineConfig,
): Promise<MasterBook[]> {
  console.log("=== Stage 3: Deduplicate ===");

  const csvFiles = findValidatedCSVFiles(config.outputPath);
  console.log(`Found ${csvFiles.length} validated CSV files`);

  if (csvFiles.length === 0) {
    console.log(
      "No books_validated.csv files found. Run 02-validate.ts first.",
    );
    return [];
  }

  // Collect all books, tracking first occurrence by ISBN
  const isbnToBook = new Map<string, MasterBook>();
  const duplicates: { isbn: string; batch: string }[] = [];

  let totalEntries = 0;
  let skippedInvalid = 0;

  for (const csvPath of csvFiles) {
    console.log(`\nProcessing ${csvPath}...`);
    const books = await loadValidatedCSV(csvPath);
    console.log(`  Read ${books.length} entries`);

    for (const book of books) {
      totalEntries++;

      // Skip invalid ISBNs
      if (!book.isbn_valid || !book.normalized_isbn) {
        skippedInvalid++;
        continue;
      }

      const isbn = book.normalized_isbn;

      if (isbnToBook.has(isbn)) {
        // Duplicate found
        duplicates.push({ isbn, batch: book.batch });
      } else {
        // First occurrence - create master record
        isbnToBook.set(isbn, {
          isbn,
          title: book.title,
          author: book.author,
          description: book.description,
          first_seen_batch: book.batch,
          image_source: book.image_file
            ? `${book.batch}/${book.image_file}`
            : "",
          location: book.location,
        });
      }
    }
  }

  // Convert to sorted array (sort by ISBN for deterministic output)
  const masterBooks = Array.from(isbnToBook.values()).sort((a, b) =>
    a.isbn.localeCompare(b.isbn),
  );

  // Write master CSV
  const masterCsvPath = join(config.outputPath, "books_master.csv");
  await writeCSV(masterCsvPath, masterBooks, [
    "isbn",
    "title",
    "author",
    "description",
    "first_seen_batch",
    "image_source",
    "location",
  ]);

  // Report statistics
  console.log(`\n✅ Deduplication complete:`);
  console.log(`   Total entries processed: ${totalEntries}`);
  console.log(`   Skipped (invalid ISBN): ${skippedInvalid}`);
  console.log(`   Unique books: ${masterBooks.length}`);
  console.log(`   Duplicates found: ${duplicates.length}`);
  console.log(`   Wrote to ${masterCsvPath}`);

  // Report duplicates if any
  if (duplicates.length > 0) {
    console.log(`\n📋 Duplicate ISBNs (copies of same book):`);
    // Group by ISBN
    const dupGroups = new Map<string, string[]>();
    for (const dup of duplicates) {
      if (!dupGroups.has(dup.isbn)) {
        dupGroups.set(dup.isbn, []);
      }
      dupGroups.get(dup.isbn)!.push(dup.batch);
    }

    let shown = 0;
    for (const [isbn, batches] of dupGroups) {
      if (shown >= 10) {
        console.log(`   ... and ${dupGroups.size - 10} more`);
        break;
      }
      const firstBatch = isbnToBook.get(isbn)?.first_seen_batch || "unknown";
      console.log(
        `   ${isbn}: first in ${firstBatch}, also in ${batches.join(", ")}`,
      );
      shown++;
    }
  }

  return masterBooks;
}

// Run directly
if (import.meta.main) {
  const outputPath = join(process.cwd(), "output");

  deduplicate({
    rawDataPath: "",
    outputPath,
    imageOutputPath: join(outputPath, "images"),
  }).catch(console.error);
}
