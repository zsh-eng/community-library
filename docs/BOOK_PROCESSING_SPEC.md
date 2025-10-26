# Book Ingestion Pipeline Specification

## Overview

A multi-step pipeline to ingest scanned book covers into a community library database. The pipeline extracts ISBNs using Gemini, validates against Google Books API, resolves cover images, and generates seed data.

## Directory Structure

```
community-library-images/
├── scripts/
│   ├── 1-compress.ts
│   ├── 2-extract-gemini.ts
│   ├── 3-lookup-google.ts
│   ├── 4-resolve-covers.ts
│   ├── 5-finalize.ts
│   └── utils.ts
├── temp/
│   ├── scans/           # Input: original scanned images
│   ├── compressed/      # Output of step 1: 1.jpg, 2.jpg, etc.
│   └── state.json       # Pipeline state (persisted between steps)
├── assets/
│   └── books/
│       ├── scanned/     # Scanned covers used when no online cover found
│       └── <isbn>.jpg   # Downloaded covers from OpenLibrary
└── books.jsonl          # Final output: seed data for database
```

## State Schema

The `temp/state.json` file tracks progress through the pipeline:

```typescript
interface BookState {
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

interface PipelineState {
  books: BookState[];
  lastUpdated: string; // ISO timestamp
}
```

## Pipeline Steps

### Step 1: Compress Images (`1-compress.ts`)

**Input:** Original scans in `temp/scans/`

**Process:**

1. Read all images from `temp/scans/`
2. For each image:
   - Compress to <500KB using sharp or similar
   - Rename to sequential number: `1.jpg`, `2.jpg`, etc.
   - Save to `temp/compressed/`
3. Initialize or update `state.json` with book entries
4. Mark each as `compressed: true`

**Output:**

- Compressed images in `temp/compressed/`
- Updated `state.json`

**Error handling:** Log compression failures, mark `compressed: false`, set `review_reason`

---

### Step 2: Extract with Gemini (`2-extract-gemini.ts`)

**Input:** `state.json` and `temp/compressed/*.jpg`

**Process:**

1. For each book where `compressed: true` and `gemini_extracted: false`:
   - Send image to Gemini Flash with prompt (but flesh out this prompt properly,
     including tellling Gemini to return the appropriate error if it doesn't know the answer):
     "Extract the ISBN, title, and author from this book cover"
   - Note that we have to use `generateText` with the AI SDK because `generateObject` doesn't support
   - Parse response into `gemini_isbn`, `gemini_title`, `gemini_author`
   - If extraction fails, set `gemini_error`
2. Update `state.json` with extracted data
3. Mark `gemini_extracted: true`

**Output:** Updated `state.json` with Gemini extractions

**Error handling:**

- Rate limit delays between requests
- Retry transient failures
- Store error messages for manual review

---

### Step 3: Validate with Google Books (`3-lookup-google.ts`)

**Input:** `state.json`

**Process:**

1. For each book where `gemini_extracted: true` and `google_looked_up: false`:
   - Normalize `gemini_isbn` to ISBN-13 format (remove hyphens)
   - Query Google Books API: `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`
   - Extract: `title`, `author`, `description`, normalized `isbn`
   - Compare Gemini extraction vs Google result:
     - If significant mismatch, set `mismatch: true` and `needs_review: true`
   - If not found, set `google_error` and `needs_review: true`
2. Update `state.json` with validated data
3. Mark `google_looked_up: true`

**Output:** Updated `state.json` with validated metadata

**Error handling:**

- Handle API rate limits
- Store lookup failures for manual ISBN correction
- Flag mismatches for human review

---

### Step 4: Resolve Cover Images (`4-resolve-covers.ts`)

**Input:** `state.json`

**Process:**

1. For each book where `google_looked_up: true` and `cover_resolved: false`:
   - Construct OpenLibrary URL: `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`
   - Check if image exists and is valid (not 404, not placeholder, size >50KB)
   - If valid:
     - Set `cover_source: 'openlibrary'`
     - Set `openlibrary_valid: true`
     - Download image to `assets/books/{isbn}.jpg`
   - If invalid:
     - Set `cover_source: 'scanned'`
     - Set `openlibrary_valid: false`
     - Copy from `temp/compressed/{id}.jpg` to `assets/books/scanned/{isbn}.jpg`
2. Mark `cover_resolved: true`

**Output:**

- Images in `assets/books/` or `assets/books/scanned/`
- Updated `state.json`

**Error handling:** Flag download failures for manual intervention

---

### Step 5: Finalize and Generate Seed Data (`5-finalize.ts`)

**Input:** `state.json`

**Process:**

1. For each book where `cover_resolved: true` and `finalized: false`:
   - Generate jsdelivr CDN URL:
     - If `cover_source: 'openlibrary'`: `https://cdn.jsdelivr.net/gh/zsh-eng/community-library-images@main/assets/books/{isbn}.jpg`
     - If `cover_source: 'scanned'`: `https://cdn.jsdelivr.net/gh/zsh-eng/community-library-images@main/assets/books/scanned/{isbn}.jpg`
   - Set `final_image_path` and `cover_url`
   - Mark `finalized: true`
2. Generate `books.jsonl` with one JSON object per line:
   ```json
   {
     "isbn": "9781234567890",
     "title": "Book Title",
     "author": "Author Name",
     "description": "Description text",
     "imageUrl": "https://cdn.jsdelivr.net/..."
   }
   ```
3. Generate summary report:
   - Total books processed
   - Books needing review (with reasons)
   - Coverage statistics (OpenLibrary vs scanned)

**Output:**

- `books.jsonl` (seed data)
- Updated `state.json`
- Summary report printed to console

**Error handling:** Validate JSONL format before writing

---

## Utility Functions (`utils.ts`)

Common functions used across scripts:

```typescript
// Load and save state
function loadState(): PipelineState;
function saveState(state: PipelineState): void;

// ISBN normalization
function normalizeISBN(isbn: string): string; // Convert to ISBN-13, remove hyphens

// Image validation
function isValidImage(url: string): Promise<boolean>;
function getImageSize(path: string): Promise<number>;

// Error logging
function logError(bookId: number, step: string, error: string): void;
```

---

## Running the Pipeline

Execute scripts sequentially:

```bash
bun run scripts/1-compress.ts
# Review state.json, fix any issues
bun run scripts/2-extract-gemini.ts
# Review extractions, fix any issues
bun run scripts/3-lookup-google.ts
# Review mismatches, fix any issues
bun run scripts/4-resolve-covers.ts
# Review cover resolutions
bun run scripts/5-finalize.ts
# Review books.jsonl and summary
```

After each step, review `state.json` for entries with `needs_review: true` and fix issues before proceeding.

---

## Notes

- All ISBNs stored in state are ISBN-13 format without hyphens
- Images in `assets/books/` are kept under 1MB for GitHub/jsdelivr limits
- The pipeline is resumable: re-running a script will skip already-processed books
- Human review is expected between steps; scripts are not fully defensive
- Rate limiting is implemented for external API calls (Gemini, Google Books)
