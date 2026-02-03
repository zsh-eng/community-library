/**
 * Stage 4: Process Images
 *
 * Compresses images to webp format and renames them by ISBN.
 * For duplicate ISBNs, keeps first scan only.
 *
 * Input: Raw scans from batch folders + books_master.csv
 * Output: Processed images in output/images/ renamed by ISBN
 */

import { existsSync } from "fs";
import { copyFile, mkdir, readFile, writeFile } from "fs/promises";
import { dirname, extname, join } from "path";
import { readCSV } from "../lib/csv";
import type { MasterBook, PipelineConfig } from "../lib/types";

// Image processing configuration
const MAX_WIDTH = 400;
const MAX_FILE_SIZE = 50 * 1024; // 50KB target
const QUALITY_START = 85;
const QUALITY_MIN = 30;

/**
 * Check if sharp is available for image processing
 */
async function hasSharp(): Promise<boolean> {
  try {
    await import("sharp");
    return true;
  } catch {
    return false;
  }
}

/**
 * Process a single image with sharp
 */
async function processImageWithSharp(
  inputPath: string,
  outputPath: string,
): Promise<{ success: boolean; size: number; error?: string }> {
  try {
    const sharp = (await import("sharp")).default;

    let quality = QUALITY_START;
    let buffer: Buffer;

    // Read and resize
    const image = sharp(inputPath).resize(MAX_WIDTH, undefined, {
      fit: "inside",
      withoutEnlargement: true,
    });

    // Try to get under target size
    while (quality >= QUALITY_MIN) {
      buffer = await image.webp({ quality }).toBuffer();

      if (buffer.length <= MAX_FILE_SIZE) {
        break;
      }
      quality -= 5;
    }

    // Write output
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buffer!);

    return { success: true, size: buffer!.length };
  } catch (error) {
    return {
      success: false,
      size: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Copy image without processing (fallback when sharp unavailable)
 */
async function copyImageFallback(
  inputPath: string,
  outputPath: string,
): Promise<{ success: boolean; size: number; error?: string }> {
  try {
    await mkdir(dirname(outputPath), { recursive: true });

    // If source is already webp, just copy
    if (extname(inputPath).toLowerCase() === ".webp") {
      await copyFile(inputPath, outputPath);
      const content = await readFile(outputPath);
      return { success: true, size: content.length };
    }

    // Otherwise copy with .jpg extension preserved (can't convert without sharp)
    const jpgOutput = outputPath.replace(".webp", extname(inputPath));
    await copyFile(inputPath, jpgOutput);
    const content = await readFile(jpgOutput);
    console.log(
      `    ⚠️  Copied as ${extname(inputPath)} (install sharp for webp conversion)`,
    );
    return { success: true, size: content.length };
  } catch (error) {
    return {
      success: false,
      size: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Find the source image for a book
 */
function findSourceImage(
  rawDataPath: string,
  imageSource: string,
): string | null {
  if (!imageSource) {
    return null;
  }

  // imageSource format: "{location}-batch-{num}/{filename}"
  const parts = imageSource.split("/");
  if (parts.length !== 2) {
    return null;
  }

  const [batchId, filename] = parts;

  // Parse batch ID: "cendana-batch-01"
  const match = batchId.match(/^(\w+)-batch-(\d+)$/);
  if (!match) {
    return null;
  }

  const [, location, batchNum] = match;
  const batchDir = join(rawDataPath, location, `batch-${batchNum}`);

  // Try exact filename
  const exactPath = join(batchDir, filename);
  if (existsSync(exactPath)) {
    return exactPath;
  }

  // Try with different extensions
  const baseName = filename.replace(/\.(jpg|jpeg|webp)$/i, "");
  for (const ext of [".jpg", ".jpeg", ".webp", ".JPG", ".JPEG", ".WEBP"]) {
    const tryPath = join(batchDir, baseName + ext);
    if (existsSync(tryPath)) {
      return tryPath;
    }
  }

  return null;
}

/**
 * Main process images function
 */
export async function processImages(config: PipelineConfig): Promise<void> {
  console.log("=== Stage 4: Process Images ===");

  // Check for sharp
  const sharpAvailable = await hasSharp();
  if (sharpAvailable) {
    console.log("Using sharp for image processing");
  } else {
    console.log(
      "⚠️  sharp not available - images will be copied without processing",
    );
    console.log("   Install sharp for webp conversion: bun add sharp");
  }

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

  console.log(`Processing ${books.length} books`);

  // Create output directory
  const imageOutputDir = join(config.imageOutputPath, "covers");
  await mkdir(imageOutputDir, { recursive: true });

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let totalSize = 0;

  for (const book of books) {
    const outputPath = join(imageOutputDir, `${book.isbn}.webp`);

    // Skip if already processed
    if (existsSync(outputPath)) {
      skipped++;
      continue;
    }

    // Find source image
    const sourcePath = findSourceImage(config.rawDataPath, book.image_source);

    if (!sourcePath) {
      if (book.image_source) {
        console.log(
          `  ⚠️  ${book.isbn}: Source not found (${book.image_source})`,
        );
      }
      errors++;
      continue;
    }

    // Process image
    const result = sharpAvailable
      ? await processImageWithSharp(sourcePath, outputPath)
      : await copyImageFallback(sourcePath, outputPath);

    if (result.success) {
      processed++;
      totalSize += result.size;

      if (processed % 50 === 0) {
        console.log(`  Processed ${processed} images...`);
      }
    } else {
      console.log(`  ❌ ${book.isbn}: ${result.error}`);
      errors++;
    }
  }

  console.log(`\n✅ Image processing complete:`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Skipped (already exists): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Output: ${imageOutputDir}`);

  if (processed > 0) {
    console.log(
      `   Average size: ${Math.round(totalSize / processed / 1024)} KB`,
    );
  }
}

// Run directly
if (import.meta.main) {
  const rawDataPath =
    process.env.RAW_DATA_PATH ||
    join(process.env.HOME || "", "Downloads/library-images");
  const outputPath = join(process.cwd(), "output");

  processImages({
    rawDataPath,
    outputPath,
    imageOutputPath: join(outputPath, "images"),
  }).catch(console.error);
}
