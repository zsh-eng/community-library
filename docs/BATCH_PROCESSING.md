# Batch Processing Guide

This guide explains how to process batches of books and their cover images for the community library.

## Quick Reference

```bash
# Process batch 1 for Elm location (IDs start at 1)
bun run scripts/generate-seed-from-json.ts 1 elm
bun run scripts/process-images.ts 1 elm

# Process batch 2 for Elm location (IDs start at 26, assuming batch 1 had 25 books)
bun run scripts/generate-seed-from-json.ts 2 elm 26
bun run scripts/process-images.ts 2 elm

# Process batch 3 for Elm location (IDs start at 51, assuming batch 2 had 25 books)
bun run scripts/generate-seed-from-json.ts 3 elm 51
bun run scripts/process-images.ts 3 elm

# Future: Process for other locations
bun run scripts/generate-seed-from-json.ts 1 saga
bun run scripts/generate-seed-from-json.ts 1 cendana
```

## Overview

The batch processing system handles:
1. Reading book data from JSON files
2. Renaming cover images to match ISBN numbers (with natural numeric sorting)
3. Handling duplicate books (multiple copies of the same ISBN)
4. Managing book ID offsets across multiple batches to prevent ID conflicts
5. Generating SQL seed data
6. Resizing and compressing images for web use

## Directory Structure

```
temp/
├── batch-1/          # First batch (currently elm location)
│   ├── books.json    # or any .json file
│   ├── image_1.jpg
│   ├── image_2.jpg
│   └── ...
├── batch-2/          # Second batch (currently elm location)
│   ├── data.json
│   ├── elm_1.jpg
│   └── ...
└── batch-3/          # Third batch (currently elm location)
    ├── books.json
    ├── cover_1.jpg
    └── ...
```

## Location Mapping

Locations are specified by name:
- `saga` → Location ID 1
- `elm` → Location ID 2
- `cendana` → Location ID 3

**Note:** Currently, batches 1, 2, and 3 are all for the **elm** location. When processing books for other locations in the future, you can use the same batch directories with different location arguments.

## Prerequisites

Install required image processing tools:

```bash
# macOS
brew install imagemagick jpegoptim

# Verify installation
which mogrify
which jpegoptim
```

## Workflow

### Step 1: Prepare Your Data

1. Place your JSON file in the appropriate batch directory (e.g., `/temp/batch-1/`)
2. Place all book cover images in the same directory
3. Images should be named in order (e.g., `book_1.jpg`, `book_2.jpg`, etc.)
4. The order of images should match the order of books in your JSON file

### Step 2: Generate SQL and Rename Images

Run the seed generation script with the batch number, location, and optional ID offset:

```bash
# Syntax: bun run scripts/generate-seed-from-json.ts <batch-number> <location> [id-offset]

# For batch 1 at elm (IDs start at 1 by default)
bun run scripts/generate-seed-from-json.ts 1 elm

# For batch 2 at elm (IDs start at 26, assuming batch 1 ended at ID 25)
bun run scripts/generate-seed-from-json.ts 2 elm 26

# For batch 3 at elm (IDs start at 51, assuming batch 2 ended at ID 50)
bun run scripts/generate-seed-from-json.ts 3 elm 51
```

**Important:** The ID offset parameter ensures that book IDs don't conflict across batches. Calculate the offset by checking the last book ID from the previous batch and adding 1.

This script will:
- Find the JSON file in the batch directory
- Read all book entries and adjust their IDs based on the offset parameter
- Rename images from their original names to ISBN-based names using **natural numeric sorting** (1, 2, 3... not 1, 10, 11, 2...)
  - First occurrence: `9780123456789.jpg`
  - Second occurrence (duplicate): `9780123456789-1.jpg`
  - Third occurrence: `9780123456789-2.jpg`
  - etc.
- Generate SQL that:
  - Creates one book record per unique ISBN with the correct ID range
  - Creates multiple copy records for duplicate ISBNs
  - Assigns all copies to the specified location
- Output SQL to `scripts/seed-from-json-batch-<number>-<location>.sql`

### Step 3: Process Images

Run the image processing script with the same batch number and location:

```bash
# For batch 1 at elm
bun run scripts/process-images.ts 1 elm

# For batch 2 at elm
bun run scripts/process-images.ts 2 elm

# For batch 3 at elm
bun run scripts/process-images.ts 3 elm
```

This script will:
- Resize all images to 300px width (maintaining aspect ratio)
- Compress images to maximum 30KB file size
- Preserve the ISBN-based filenames

### Step 4: Upload Images

After processing, upload the images to your CDN at the location-specific path:

```bash
# Images are in the batch directory
# e.g., temp/batch-1/*.jpg, temp/batch-2/*.jpg, temp/batch-3/*.jpg

# For elm location, upload to:
# https://cdn.jsdelivr.net/gh/zsh-eng/community-library-images@main/assets/books/elm-scans/

# For other locations:
# .../assets/books/saga-scans/
# .../assets/books/cendana-scans/
```

### Step 5: Apply SQL

Run the generated SQL file in your database:

```bash
# Review the generated SQL first
cat scripts/seed-from-json-batch-1-elm.sql

# Apply to database (adjust connection details as needed)
sqlite3 your-database.db < scripts/seed-from-json-batch-1-elm.sql
```

## Handling Duplicate Books

When the same ISBN appears multiple times in your JSON:
- Only ONE book record is created (for the unique ISBN)
- Multiple copy records are created, each with an incrementing copy number
- Images are renamed with suffixes: `ISBN.jpg`, `ISBN-1.jpg`, `ISBN-2.jpg`, etc.
- All copies point to the same book record via `book_id`

### Example

JSON has 3 entries with ISBN `9780142437209`:

**Books table:**
- 1 record created with ISBN `9780142437209`

**Book_copies table:**
- Copy 1: `COPY-ABC123`, book_id: X, copy_number: 1
- Copy 2: `COPY-DEF456`, book_id: X, copy_number: 2
- Copy 3: `COPY-GHI789`, book_id: X, copy_number: 3

**Images:**
- `9780142437209.jpg` (used for the book record)
- `9780142437209-1.jpg` (kept for backup, not used)
- `9780142437209-2.jpg` (kept for backup, not used)

## Processing Multiple Batches for the Same Location

Currently, all 3 batches are for the elm location. You can process them sequentially with proper ID offsets:

```bash
# Batch 1 (IDs: 1-25 if 25 books)
bun run scripts/generate-seed-from-json.ts 1 elm
bun run scripts/process-images.ts 1 elm

# Check the last ID from batch 1 output, then add 1 for batch 2
# Batch 2 (IDs: 26-50 if 25 books)
bun run scripts/generate-seed-from-json.ts 2 elm 26
bun run scripts/process-images.ts 2 elm

# Check the last ID from batch 2 output, then add 1 for batch 3
# Batch 3 (IDs: 51-75 if 25 books)
bun run scripts/generate-seed-from-json.ts 3 elm 51
bun run scripts/process-images.ts 3 elm
```

Each batch will generate a separate SQL file:
- `seed-from-json-batch-1-elm.sql` (book IDs: 1-25)
- `seed-from-json-batch-2-elm.sql` (book IDs: 26-50)
- `seed-from-json-batch-3-elm.sql` (book IDs: 51-75)

The script will display the actual ID range used after processing. Use this information to calculate the offset for the next batch.

You can combine these or apply them separately to your database without ID conflicts.

## Troubleshooting

### JSON file not found
- Ensure your JSON file is in the correct batch directory
- The script looks for any `.json` file in the batch directory

### Image count mismatch
- Check that you have one image per book entry in your JSON
- Images should be sorted alphabetically (same order as in JSON)

### mogrify or jpegoptim not found
```bash
brew install imagemagick jpegoptim
```

### Images already renamed
- The script will skip renaming if the target filename already exists
- Delete or backup existing ISBN-named files if you need to re-run

### Wrong ID range or duplicate IDs
- Make sure to check the output from the previous batch to get the last book ID
- Add 1 to that ID and use it as the offset for the next batch
- Example: If batch 1 ends at ID 25, use `26` as the offset for batch 2

### Invalid location error
- Make sure you're using lowercase location names: `saga`, `elm`, or `cendana`
- Not `Elm` or `ELM`

## Notes

- The original images are backed up on Google Drive
- Duplicate book images (with -1, -2 suffixes) are kept but not used in production
- All copies are marked as "available" status by default
- QR codes are randomly generated in format: `COPY-XXXXXX` (6 random alphanumeric chars)
- Book IDs are adjusted based on the offset parameter to prevent conflicts across batches
- Batch numbers are independent of locations - you can process any batch for any location
- Images are sorted naturally by number (1, 2, 3... not 1, 10, 11, 2...) before renaming
