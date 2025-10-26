import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// State Schema
export interface BookState {
  id: number; // Sequential: 1, 2, 3...

  // Step 1: Compression
  compressed: boolean;
  compressedPath?: string; // "temp/compressed/1.jpg"
  originalSize?: number;
  compressedSize?: number;

  // Step 2: Gemini Extraction
  gemini_extracted: boolean;
  gemini_isbn?: string;
  gemini_title?: string;
  gemini_author?: string;
  gemini_error?: string;

  // Step 3: Google Books Validation
  google_looked_up: boolean;
  isbn?: string; // Normalized ISBN-13 (numbers only, no hyphens)
  title?: string;
  author?: string;
  description?: string;
  google_error?: string;
  mismatch?: boolean; // True if Gemini and Google data differ significantly

  // Step 4: Cover Resolution
  cover_resolved: boolean;
  cover_source?: "openlibrary" | "scanned";
  openlibrary_url?: string; // For reference
  openlibrary_valid?: boolean; // False if image doesn't exist/is placeholder

  // Step 5: Finalization
  finalized: boolean;
  final_image_path?: string; // "assets/books/9781234567890.jpg"
  cover_url?: string; // Full jsdelivr CDN URL

  // Review flags
  needs_review: boolean;
  review_reason?: string;
}

export interface PipelineState {
  books: BookState[];
  lastUpdated: string; // ISO timestamp
}

const STATE_FILE = "temp/state.json";

/**
 * Load the pipeline state from disk
 */
export async function loadState(): Promise<PipelineState> {
  if (!existsSync(STATE_FILE)) {
    return {
      books: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  const content = await readFile(STATE_FILE, "utf-8");
  return JSON.parse(content);
}

/**
 * Save the pipeline state to disk
 */
export async function saveState(state: PipelineState): Promise<void> {
  state.lastUpdated = new Date().toISOString();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Normalize ISBN to ISBN-13 format (remove hyphens, ensure 13 digits)
 */
export function normalizeISBN(isbn: string): string {
  // Remove all non-digit characters
  const digits = isbn.replace(/\D/g, "");

  // If it's ISBN-10, convert to ISBN-13
  if (digits.length === 10) {
    // Add 978 prefix and recalculate check digit
    const base = "978" + digits.slice(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return base + checkDigit;
  }

  // Already ISBN-13, just return the digits
  return digits;
}

/**
 * Check if an image URL returns a valid image
 */
export async function isValidImage(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      return false;
    }

    // Check size - should be > 50KB (placeholder images are usually small)
    const buffer = await response.arrayBuffer();
    return buffer.byteLength > 50 * 1024;
  } catch (error) {
    return false;
  }
}

/**
 * Get the size of a file in bytes
 */
export async function getImageSize(filePath: string): Promise<number> {
  const stats = await Bun.file(filePath).size;
  return stats;
}

/**
 * Log an error for a specific book and step
 */
export function logError(bookId: number, step: string, error: string): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Book ${bookId} - ${step}: ${error}`);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Get all files in a directory with a specific extension
 */
export async function getFilesInDirectory(
  dirPath: string,
  extension: string = ".jpg"
): Promise<string[]> {
  const { readdirSync } = await import("fs");
  const files = readdirSync(dirPath);
  return files
    .filter((file) => file.toLowerCase().endsWith(extension.toLowerCase()))
    .sort()
    .map((file) => path.join(dirPath, file));
}
