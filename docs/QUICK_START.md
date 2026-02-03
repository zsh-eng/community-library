# Quick Start Guide

Step-by-step guide for processing new book batches.

## Prerequisites

1. **Bun** - JavaScript runtime (install from [bun.sh](https://bun.sh))
2. **Access to Google Drive** - Where raw batch data is stored
3. **Wrangler CLI** - For database operations (installed via pnpm)

## Adding New Books

### Step 1: Download Batch Data

Download the batch folder from Google Drive to your local machine:

```
~/Downloads/library-images/
├── cendana/
│   ├── batch-01/
│   │   ├── metadata.json
│   │   ├── cendana-batch-01_001.jpg
│   │   └── ...
│   └── batch-02/
└── elm/
    └── ...
```

Each batch should contain:

- `metadata.json` - Array of book records with ISBN, title, author, etc.
- Image files - Named `{location}-batch-{num}_{index}.jpg`

### Step 2: Run the Pipeline

```bash
cd community-library

# Set path to your downloaded data
export RAW_DATA_PATH=~/Downloads/library-images

# Run the pipeline
bun run scripts/pipeline/run-all.ts
```

This will:

1. Extract book data from all batch metadata.json files
2. Validate and normalize ISBNs
3. Deduplicate books across all batches
4. Compress images to webp format
5. Generate SQL seed files

### Step 3: Review Output

Check the generated files:

```bash
# View unique books
open output/books_master.csv

# Check for any books needing review
grep "true" output/*/batch-*/books_validated.csv

# Preview SQL
head -50 output/seed-dev.sql
```

**Things to check:**

- No duplicate ISBNs in `books_master.csv`
- Entries with `needs_review=true` have been addressed
- Book count matches expectations

### Step 4: Apply to Local Database

Test locally first:

```bash
# Apply to local D1 database
pnpm dlx wrangler d1 execute community-library-db --local --file=./output/seed-dev.sql

# Verify
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*/db.sqlite \
  "SELECT COUNT(*) as books FROM books; SELECT COUNT(*) as copies FROM book_copies;"
```

### Step 5: Apply to Production

Once verified locally:

```bash
# Apply books only to production
pnpm dlx wrangler d1 execute community-library-db --remote --file=./output/seed-prod.sql
```

Note: Production uses `seed-prod.sql` which contains books only (no copies).

### Step 6: Push Images to CDN

Copy processed images to the CDN repository:

```bash
# Copy images
cp -r output/images/covers/ ../community-library-images/assets/covers/

# Push to GitHub
cd ../community-library-images
git add assets/covers/
git commit -m "Add book covers from batch processing"
git push
```

Images are automatically served via jsDelivr CDN.

### Step 7: Link Physical Copies

With pre-printed QR stickers:

1. Place QR sticker on physical book
2. Open admin miniapp
3. Search/browse to find the book
4. Scan the QR sticker
5. System creates `book_copies` record

## Quick Reference

| Command                                             | Description           |
| --------------------------------------------------- | --------------------- |
| `bun run scripts/pipeline/run-all.ts`               | Full pipeline         |
| `bun run scripts/pipeline/run-all.ts --skip-images` | Skip image processing |
| `bun run scripts/pipeline/run-all.ts --stage=3`     | Run only stage 3      |
| `bun run scripts/pipeline/01-extract.ts`            | Run extract only      |

## Environment Variables

| Variable        | Default                      | Description            |
| --------------- | ---------------------------- | ---------------------- |
| `RAW_DATA_PATH` | `~/Downloads/library-images` | Path to raw batch data |

## Metadata Format

Expected `metadata.json` format:

```json
[
  {
    "id": 1,
    "isbn": "9789810787691",
    "title": "Life and Times of a Social Worker",
    "description": "No description available",
    "author": "K. V. Veloo",
    "image_url": "",
    "room": "3",
    "category": "Social service",
    "created_at": "2025-11-17T12:07:04.504Z"
  }
]
```

## Common Issues

### Pipeline fails to find batches

- Verify folder structure matches expected format
- Check location names are lowercase (cendana, elm, saga)

### Invalid ISBNs

- Check `books_validated.csv` for `isbn_valid=false`
- Manually fix in source metadata.json if needed

### Images not converting

- Install sharp: `bun add sharp`
- Without sharp, images are copied without conversion
