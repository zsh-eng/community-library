import sharp from "sharp";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import {
  loadState,
  saveState,
  getImageSize,
  formatBytes,
  getFilesInDirectory,
  logError,
  type BookState,
} from "./utils";

const SCANS_DIR = "temp/scans";
const COMPRESSED_DIR = "temp/compressed";
const MAX_SIZE_KB = 500;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

/**
 * Compress a single image to under 500KB
 */
async function compressImage(
  inputPath: string,
  outputPath: string
): Promise<{ originalSize: number; compressedSize: number }> {
  const originalSize = await getImageSize(inputPath);

  // Start with quality 85 and reduce if necessary
  let quality = 85;
  let compressedSize = 0;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    await sharp(inputPath)
      .jpeg({ quality, mozjpeg: true })
      .toFile(outputPath);

    compressedSize = await getImageSize(outputPath);

    // If we're under the target size, we're done
    if (compressedSize <= MAX_SIZE_BYTES) {
      break;
    }

    // Reduce quality and try again
    quality -= 10;
    attempts++;

    if (quality < 20) {
      // If quality gets too low, try resizing instead
      const metadata = await sharp(inputPath).metadata();
      const currentWidth = metadata.width || 1000;
      const newWidth = Math.floor(currentWidth * 0.9);

      await sharp(inputPath)
        .resize(newWidth)
        .jpeg({ quality: 75, mozjpeg: true })
        .toFile(outputPath);

      compressedSize = await getImageSize(outputPath);
      break;
    }
  }

  return { originalSize, compressedSize };
}

/**
 * Main compression function
 */
async function compressImages() {
  console.log("📸 Starting image compression...\n");

  // Ensure output directory exists
  if (!existsSync(COMPRESSED_DIR)) {
    await mkdir(COMPRESSED_DIR, { recursive: true });
  }

  // Load existing state or create new
  const state = await loadState();

  // Get all image files from scans directory
  const scanFiles = await getFilesInDirectory(SCANS_DIR, ".jpg");

  if (scanFiles.length === 0) {
    console.log("❌ No images found in temp/scans/");
    return;
  }

  console.log(`Found ${scanFiles.length} images to process\n`);

  // Process each image
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < scanFiles.length; i++) {
    const inputPath = scanFiles[i];
    const bookId = i + 1;
    const outputFilename = `${bookId}.jpg`;
    const outputPath = path.join(COMPRESSED_DIR, outputFilename);
    const relativeOutputPath = `temp/compressed/${outputFilename}`;

    console.log(`[${bookId}/${scanFiles.length}] Processing: ${path.basename(inputPath)}`);

    // Check if this book already exists in state and is already compressed
    const existingBook = state.books.find((b) => b.id === bookId);
    if (existingBook && existingBook.compressed && existsSync(outputPath)) {
      console.log(`  ⏭️  Already compressed, skipping`);
      skippedCount++;
      continue;
    }

    try {
      // Compress the image
      const { originalSize, compressedSize } = await compressImage(
        inputPath,
        outputPath
      );

      const compressionRatio = (
        ((originalSize - compressedSize) / originalSize) *
        100
      ).toFixed(1);

      console.log(
        `  ✅ ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${compressionRatio}% reduction)`
      );

      // Update or create book state
      const bookIndex = state.books.findIndex((b) => b.id === bookId);
      const bookState: BookState = {
        id: bookId,
        compressed: true,
        compressedPath: relativeOutputPath,
        originalSize,
        compressedSize,
        gemini_extracted: false,
        google_looked_up: false,
        cover_resolved: false,
        finalized: false,
        needs_review: false,
      };

      if (bookIndex >= 0) {
        // Update existing book
        state.books[bookIndex] = {
          ...state.books[bookIndex],
          ...bookState,
        };
      } else {
        // Add new book
        state.books.push(bookState);
      }

      processedCount++;
    } catch (error) {
      errorCount++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logError(bookId, "compression", errorMessage);

      // Create or update book state with error
      const bookIndex = state.books.findIndex((b) => b.id === bookId);
      const bookState: BookState = {
        id: bookId,
        compressed: false,
        gemini_extracted: false,
        google_looked_up: false,
        cover_resolved: false,
        finalized: false,
        needs_review: true,
        review_reason: `Compression failed: ${errorMessage}`,
      };

      if (bookIndex >= 0) {
        state.books[bookIndex] = {
          ...state.books[bookIndex],
          ...bookState,
        };
      } else {
        state.books.push(bookState);
      }
    }
  }

  // Save state
  await saveState(state);

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Compression Summary");
  console.log("=".repeat(50));
  console.log(`Total images: ${scanFiles.length}`);
  console.log(`✅ Processed: ${processedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`\nState saved to: temp/state.json`);
  console.log(`Compressed images in: ${COMPRESSED_DIR}/`);

  if (errorCount > 0) {
    console.log(
      `\n⚠️  ${errorCount} image(s) failed to compress. Check state.json for details.`
    );
  }

  console.log("\n✨ Step 1 complete! You can now run: bun run scripts/2-extract-gemini.ts");
}

// Run the script
compressImages().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
