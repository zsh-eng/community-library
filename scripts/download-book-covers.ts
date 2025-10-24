#!/usr/bin/env bun

import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

// Define the schema for book data
const BookSchema = z.object({
  isbn: z.string(),
  title: z.string(),
  author: z.string(),
  description: z.string(),
  image_url: z.url(),
});

type Book = z.infer<typeof BookSchema>;

// Read and parse the JSONL file
const SEED_FILE = join(import.meta.dir, "books_seed_data.jsonl");
const ASSETS_DIR = join(import.meta.dir, "..", "src", "assets", "books");

async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  writeFileSync(filepath, buffer);
}

async function main() {
  console.log("📚 Starting book cover download...\n");

  // Ensure assets directory exists
  if (!existsSync(ASSETS_DIR)) {
    mkdirSync(ASSETS_DIR, { recursive: true });
    console.log(`✅ Created directory: ${ASSETS_DIR}\n`);
  }

  // Read the JSONL file
  const fileContent = readFileSync(SEED_FILE, "utf-8");
  const lines = fileContent.trim().split("\n");

  console.log(`Found ${lines.length} books to process\n`);

  let successCount = 0;
  let failureCount = 0;

  // Process each line
  for (const line of lines) {
    try {
      // Parse JSON and validate with Zod
      const bookData = JSON.parse(line);
      const book = BookSchema.parse(bookData);

      // Create filename from ISBN
      const filename = `${book.isbn}.jpg`;
      const filepath = join(ASSETS_DIR, filename);

      // Download the image
      await downloadImage(book.image_url, filepath);

      console.log(`✅ Successfully downloaded: ${book.title} (${book.isbn})`);
      successCount++;
    } catch (error) {
      const bookData = JSON.parse(line);
      console.error(
        `❌ Failed to download: ${bookData.title || "Unknown"} (${bookData.isbn || "Unknown ISBN"})`,
      );
      console.error(
        `   Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      failureCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`📊 Download Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📦 Total: ${lines.length}`);
  console.log("=".repeat(50));
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
