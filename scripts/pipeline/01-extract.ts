/**
 * Stage 1: Extract
 *
 * Extracts book data from batch metadata.json files and produces
 * books_raw.csv for each batch.
 *
 * Input: {batch}/metadata.json
 * Output: output/{location}/{batch}/books_raw.csv
 */

import { existsSync, readdirSync } from "fs";
import { mkdir, readFile } from "fs/promises";
import { basename, join } from "path";
import { writeCSV } from "../lib/csv";
import type {
  BatchInfo,
  ExtractedBook,
  PipelineConfig,
  RawBookEntry,
} from "../lib/types";

/**
 * Discover all batches in the raw data directory
 */
export function discoverBatches(rawDataPath: string): BatchInfo[] {
  const batches: BatchInfo[] = [];

  // Expected structure: rawDataPath/{location}/batch-{num}/
  const locations = ["cendana", "elm", "saga"];

  for (const location of locations) {
    const locationPath = join(rawDataPath, location);
    if (!existsSync(locationPath)) {
      continue;
    }

    const entries = readdirSync(locationPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("batch-")) {
        const batchPath = join(locationPath, entry.name);
        const batchNumber = entry.name.replace("batch-", "");
        batches.push({
          location,
          batchNumber,
          batchId: `${location}-batch-${batchNumber}`,
          path: batchPath,
        });
      }
    }
  }

  // Sort by location then batch number
  batches.sort((a, b) => {
    if (a.location !== b.location) {
      return a.location.localeCompare(b.location);
    }
    return parseInt(a.batchNumber) - parseInt(b.batchNumber);
  });

  return batches;
}

/**
 * Find metadata.json file in batch directory
 */
function findMetadataFile(batchPath: string): string | null {
  const files = readdirSync(batchPath);

  // Look for metadata.json first
  if (files.includes("metadata.json")) {
    return join(batchPath, "metadata.json");
  }

  // Fall back to any .json file
  const jsonFile = files.find((f) => f.endsWith(".json"));
  return jsonFile ? join(batchPath, jsonFile) : null;
}

/**
 * Find image files in batch directory and map index to filename
 */
function findImageFiles(
  batchPath: string,
  batchId: string,
): Map<number, string> {
  const files = readdirSync(batchPath);
  const imageMap = new Map<number, string>();

  // Match pattern: {location}-batch-{num}_{index}.jpg or .webp
  const pattern = new RegExp(
    `^${batchId.replace("-", "-")}_(\\d+)\\.(jpg|jpeg|webp)$`,
    "i",
  );

  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const index = parseInt(match[1]);
      imageMap.set(index, file);
    }
  }

  // Also try simple numeric naming (001.jpg, 002.jpg, etc.)
  const simplePattern = /^(\d+)\.(jpg|jpeg|webp)$/i;
  for (const file of files) {
    const match = file.match(simplePattern);
    if (match) {
      const index = parseInt(match[1]);
      if (!imageMap.has(index)) {
        imageMap.set(index, file);
      }
    }
  }

  return imageMap;
}

/**
 * Extract books from a single batch
 */
async function extractBatch(
  batch: BatchInfo,
  outputPath: string,
): Promise<ExtractedBook[]> {
  console.log(`\nProcessing ${batch.batchId}...`);

  const metadataPath = findMetadataFile(batch.path);
  if (!metadataPath) {
    console.error(`  No metadata file found in ${batch.path}`);
    return [];
  }

  console.log(`  Reading ${basename(metadataPath)}...`);
  const content = await readFile(metadataPath, "utf-8");
  const rawBooks: RawBookEntry[] = JSON.parse(content);

  console.log(`  Found ${rawBooks.length} book entries`);

  // Find image files
  const imageMap = findImageFiles(batch.path, batch.batchId);
  console.log(`  Found ${imageMap.size} image files`);

  // Extract books
  const extractedBooks: ExtractedBook[] = [];

  for (let i = 0; i < rawBooks.length; i++) {
    const raw = rawBooks[i];
    const scanIndex = i + 1; // 1-indexed

    // Find corresponding image
    const imageFile = imageMap.get(scanIndex) || "";

    // Determine if review is needed
    let needsReview = false;
    let reviewReason = "";

    if (!raw.isbn || raw.isbn.trim() === "") {
      needsReview = true;
      reviewReason = "Missing ISBN";
    } else if (raw.isbn.toUpperCase() === "INVALID") {
      needsReview = true;
      reviewReason = "Could not extract ISBN";
    } else if (!raw.title || raw.title.trim() === "") {
      needsReview = true;
      reviewReason = "Missing title";
    } else if (
      !raw.description ||
      raw.description === "No description available"
    ) {
      // Don't flag as needing review, just note it
      // needsReview = true;
      // reviewReason = "Missing description";
    }

    if (!imageFile) {
      needsReview = true;
      reviewReason = reviewReason
        ? `${reviewReason}; No image found`
        : "No image found";
    }

    extractedBooks.push({
      scan_index: scanIndex,
      isbn: raw.isbn || "",
      title: raw.title || "",
      author: raw.author || "",
      description: raw.description || "",
      image_file: imageFile,
      needs_review: needsReview,
      review_reason: reviewReason,
      batch: batch.batchId,
      location: batch.location,
    });
  }

  // Write output CSV
  const batchOutputDir = join(
    outputPath,
    batch.location,
    `batch-${batch.batchNumber}`,
  );
  await mkdir(batchOutputDir, { recursive: true });

  const csvPath = join(batchOutputDir, "books_raw.csv");
  await writeCSV(csvPath, extractedBooks, [
    "scan_index",
    "isbn",
    "title",
    "author",
    "description",
    "image_file",
    "needs_review",
    "review_reason",
    "batch",
    "location",
  ]);

  console.log(`  Wrote ${extractedBooks.length} entries to ${csvPath}`);

  const reviewCount = extractedBooks.filter((b) => b.needs_review).length;
  if (reviewCount > 0) {
    console.log(`  ⚠️  ${reviewCount} books need review`);
  }

  return extractedBooks;
}

/**
 * Main extract function
 */
export async function extract(
  config: PipelineConfig,
): Promise<ExtractedBook[]> {
  console.log("=== Stage 1: Extract ===");
  console.log(`Raw data path: ${config.rawDataPath}`);

  if (!existsSync(config.rawDataPath)) {
    throw new Error(`Raw data path does not exist: ${config.rawDataPath}`);
  }

  const batches = discoverBatches(config.rawDataPath);
  console.log(`Found ${batches.length} batches`);

  const allBooks: ExtractedBook[] = [];

  for (const batch of batches) {
    const books = await extractBatch(batch, config.outputPath);
    allBooks.push(...books);
  }

  console.log(`\n✅ Extraction complete: ${allBooks.length} total entries`);

  return allBooks;
}

// Run directly
if (import.meta.main) {
  const rawDataPath =
    process.env.RAW_DATA_PATH ||
    join(process.env.HOME || "", "Downloads/library-images");
  const outputPath = join(process.cwd(), "output");

  extract({
    rawDataPath,
    outputPath,
    imageOutputPath: join(outputPath, "images"),
  }).catch(console.error);
}
