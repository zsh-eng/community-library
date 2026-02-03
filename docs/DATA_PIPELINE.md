# Data Pipeline Architecture

This document describes the data pipeline for processing book data and generating reproducible outputs for the Community Library system.

## Overview

The pipeline processes raw book data from batch scans and generates:

- Deduplicated book records (unique by ISBN)
- Compressed cover images (webp format)
- SQL seed files for development and production

### Key Design Principles

1. **Deterministic Output**: Re-running the pipeline always produces identical results
2. **ISBN-based Deduplication**: Books are unique by ISBN-13
3. **Separation of Books and Copies**: Pipeline handles books only; copies are linked via admin interface

## QR Code Flow

QR codes are pre-printed and linked via the admin interface:

1. Pipeline generates **books only** (unique by ISBN) + processes images
2. Pre-printed QR stickers (random `COPY-XXXXXX` format) are physically placed on books
3. Admin uses miniapp to scan QR code while viewing a book → creates `book_copies` record

## Directory Structure

### Input (Raw Data)

```
library-images/                    # Google Drive source
├── cendana/
│   ├── batch-01/
│   │   ├── metadata.json          # Array of book records
│   │   ├── cendana-batch-01_001.jpg
│   │   └── ...
│   └── batch-02/
│       └── ...
└── elm/
    ├── batch-01/
    └── ...
```

### Output

```
output/
├── cendana/
│   └── batch-01/
│       ├── books_raw.csv          # Stage 1 output
│       └── books_validated.csv    # Stage 2 output
├── elm/
│   └── ...
├── books_master.csv               # Stage 3 output (all unique books)
├── seed-dev.sql                   # Stage 5 output (books + test copies)
├── seed-prod.sql                  # Stage 5 output (books only)
└── images/
    └── covers/
        ├── 9789810787691.webp     # Stage 4 output
        └── ...
```

## Pipeline Stages

### Stage 1: Extract (`01-extract.ts`)

Reads batch metadata.json files and produces raw CSV.

**Input**: `{batch}/metadata.json`
**Output**: `output/{location}/{batch}/books_raw.csv`

```csv
scan_index,isbn,title,author,description,image_file,needs_review,review_reason,batch,location
1,9789811122842,Payoh,Jim K C Tan,No description,001.webp,false,,elm-batch-01,elm
2,9789811700927,State of Emergency,Jeremy Tiang,,002.webp,true,Missing description,elm-batch-01,elm
```

### Stage 2: Validate (`02-validate.ts`)

Normalizes ISBNs to ISBN-13 format and flags invalid entries.

**Input**: `output/{location}/{batch}/books_raw.csv`
**Output**: `output/{location}/{batch}/books_validated.csv`

- Converts ISBN-10 to ISBN-13
- Validates check digits
- Flags invalid ISBNs for review

### Stage 3: Deduplicate (`03-deduplicate.ts`)

Merges all books across batches by ISBN.

**Input**: All `books_validated.csv` files
**Output**: `output/books_master.csv`

```csv
isbn,title,author,description,first_seen_batch,image_source,location
9789811122842,Payoh,Jim K C Tan,No description,elm-batch-01,elm-batch-01/001.webp,elm
```

- One row per unique ISBN
- Uses first occurrence for metadata
- Tracks provenance (which batch it came from)

### Stage 4: Process Images (`04-process-images.ts`)

Compresses images and renames by ISBN.

**Input**: Raw scans from batch folders + `books_master.csv`
**Output**: `output/images/covers/{isbn}.webp`

- Resize to max 400px width
- Convert to webp format
- Target size: ~50KB
- For duplicates: keeps first scan only

### Stage 5: Generate Output (`05-generate-output.ts`)

Creates SQL seed files with deterministic IDs.

**Input**: `output/books_master.csv`
**Output**: `seed-dev.sql`, `seed-prod.sql`

**seed-dev.sql** (for local development):

```sql
INSERT INTO books (id, isbn, title, ...) VALUES ...;
INSERT INTO book_copies (qr_code_id, book_id, ...) VALUES
  ('COPY-DEV001', 1, 1, 'available', 3),
  ...;
```

**seed-prod.sql** (for production):

```sql
INSERT INTO books (id, isbn, title, ...) VALUES ...;
-- No copies - linked via admin interface
```

## Deterministic ID Generation

Book IDs are assigned deterministically:

```typescript
function assignBookIds(allBooks: Book[]): Map<string, number> {
  // 1. Get all unique ISBNs
  const uniqueIsbns = [...new Set(allBooks.map((b) => normalizeISBN(b.isbn)))];

  // 2. Sort lexicographically
  uniqueIsbns.sort();

  // 3. Assign sequential IDs
  const isbnToId = new Map<string, number>();
  uniqueIsbns.forEach((isbn, index) => {
    isbnToId.set(isbn, index + 1);
  });

  return isbnToId;
}
```

This ensures re-running the pipeline always produces identical book IDs.

## Running the Pipeline

### Full Pipeline

```bash
# Set path to raw data
export RAW_DATA_PATH=~/Downloads/library-images

# Run complete pipeline
bun run scripts/pipeline/run-all.ts
```

### Individual Stages

```bash
# Run specific stage
bun run scripts/pipeline/run-all.ts --stage=3

# Skip image processing
bun run scripts/pipeline/run-all.ts --skip-images
```

### Applying to Database

```bash
# Local development (with test copies)
pnpm dlx wrangler d1 execute community-library-db --local --file=./output/seed-dev.sql

# Production (books only)
pnpm dlx wrangler d1 execute community-library-db --remote --file=./output/seed-prod.sql
```

### Deploying Images

```bash
# Copy to CDN repo
cp -r output/images/covers/ ../community-library-images/assets/covers/

# Push to GitHub (triggers jsDelivr CDN)
cd ../community-library-images
git add assets/covers/
git commit -m "Add processed book covers"
git push
```

## Image URL Pattern

```
https://cdn.jsdelivr.net/gh/zsh-eng/community-library-images@main/assets/covers/{isbn}.webp
```

## Data Model

```
Book (unique by ISBN)
  │
  └── Created by: Pipeline (from batch processing)

BookCopy (physical instance)
  │
  ├── qr_code_id: Pre-printed random code (COPY-XXXXXX)
  ├── book_id: References books.id
  ├── location_id: Where copy currently is (MUTABLE)
  │
  └── Created by: Admin interface (scan QR while viewing book)
```

## Verification

### Determinism Test

```bash
bun run scripts/pipeline/run-all.ts
cp output/seed-prod.sql output/seed-prod-1.sql
bun run scripts/pipeline/run-all.ts
diff output/seed-prod.sql output/seed-prod-1.sql  # Should be identical
```

### Database Verification

```bash
# Query local database
sqlite3 .wrangler/state/v3/d1/.../db.sqlite "SELECT COUNT(*) FROM books;"
sqlite3 .wrangler/state/v3/d1/.../db.sqlite "SELECT COUNT(*) FROM book_copies;"
```

## Troubleshooting

### Common Issues

1. **"Raw data path does not exist"**
   - Set `RAW_DATA_PATH` environment variable
   - Verify the folder structure matches expected format

2. **"No metadata file found"**
   - Check batch folder contains `metadata.json` or a `.json` file

3. **"Invalid ISBN format"**
   - Review `books_validated.csv` for entries with `isbn_valid=false`
   - Manually correct ISBNs in source metadata if needed

4. **Image processing fails**
   - Install sharp: `bun add sharp`
   - Without sharp, images are copied without conversion

## Legacy Scripts

Previous batch processing scripts are preserved in `scripts/legacy/`:

- `generate-seed-from-json.ts` - Original single-batch processor

These are kept for reference but the new pipeline should be used for all processing.
