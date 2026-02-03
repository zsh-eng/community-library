/**
 * Shared TypeScript interfaces for the data pipeline
 */

/**
 * Raw book data as found in metadata.json files
 */
export interface RawBookEntry {
  id: number;
  isbn: string;
  title: string;
  description: string;
  author: string;
  image_url: string;
  room: string;
  category: string;
  created_at: string;
}

/**
 * Extracted book with scan metadata
 */
export interface ExtractedBook {
  scan_index: number;
  isbn: string;
  title: string;
  author: string;
  description: string;
  image_file: string;
  needs_review: boolean;
  review_reason: string;
  batch: string;
  location: string;
}

/**
 * Validated book after ISBN normalization
 */
export interface ValidatedBook extends ExtractedBook {
  normalized_isbn: string;
  isbn_valid: boolean;
}

/**
 * Master book record (deduplicated)
 */
export interface MasterBook {
  isbn: string;
  title: string;
  author: string;
  description: string;
  first_seen_batch: string;
  image_source: string;
  location: string;
}

/**
 * Final book for SQL generation (with assigned ID)
 */
export interface FinalBook extends MasterBook {
  id: number;
  image_url: string;
}

/**
 * Book copy for dev seed
 */
export interface BookCopy {
  qr_code_id: string;
  book_id: number;
  copy_number: number;
  status: "available";
  location_id: number;
}

/**
 * Location mapping
 */
export const LOCATION_MAP: Record<string, number> = {
  saga: 1,
  elm: 2,
  cendana: 3,
};

/**
 * CDN base URL for images
 */
export const IMAGE_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/zsh-eng/community-library-images@main/assets/covers";

/**
 * Batch info extracted from directory structure
 */
export interface BatchInfo {
  location: string;
  batchNumber: string;
  batchId: string; // e.g., "cendana-batch-01"
  path: string;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  rawDataPath: string;
  outputPath: string;
  imageOutputPath: string;
}
