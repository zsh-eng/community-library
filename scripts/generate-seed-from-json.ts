import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { join } from "path";

interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  description: string;
  image_url: string;
  room: string;
  category: string;
  created_at: string;
}

interface Copy {
  qrCodeId: string;
  bookId: number;
  copyNumber: number;
  status: "available";
  locationId: number;
}

const LOCATION_MAP: Record<string, number> = {
  saga: 1,
  elm: 2,
  cendana: 3,
};

const IMAGE_BASE_PATH =
  "https://cdn.jsdelivr.net/gh/zsh-eng/community-library-images@main/assets/books";

// Helper to generate a random 6-character alphanumeric string in uppercase
function generateRandomSuffix(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate QR code ID for a book copy with random suffix
function generateQrCodeId(): string {
  return `COPY-${generateRandomSuffix()}`;
}

// Read and parse JSON file
function readBooksData(filePath: string): Book[] {
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

// Find the JSON file in the batch directory
function findJsonFile(batchDir: string): string | null {
  const files = readdirSync(batchDir);
  const jsonFile = files.find((f) => f.endsWith(".json"));
  return jsonFile ? join(batchDir, jsonFile) : null;
}

// Rename images based on ISBN
function renameImagesByIsbn(batchDir: string, books: Book[]): void {
  console.log("\nRenaming images based on ISBN...");

  // Get all jpg files in the batch directory
  const files = readdirSync(batchDir);
  const imageFiles = files
    .filter((f) => f.toLowerCase().endsWith(".jpg"))
    .sort((a, b) => {
      // Extract numbers from filenames for natural sorting
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });
  console.log(imageFiles);

  // Count occurrences of each ISBN
  const isbnCounts: Record<string, number> = {};
  books.forEach((book) => {
    isbnCounts[book.isbn] = (isbnCounts[book.isbn] || 0) + 1;
  });

  // Track how many times we've seen each ISBN for suffixing
  const isbnUsageCount: Record<string, number> = {};

  // Rename images
  books.forEach((book, index) => {
    if (index >= imageFiles.length) {
      console.warn(
        `Warning: No image file for book at index ${index} (ISBN: ${book.isbn})`,
      );
      return;
    }

    const oldPath = join(batchDir, imageFiles[index]);
    const currentIsbnCount = isbnUsageCount[book.isbn] || 0;
    isbnUsageCount[book.isbn] = currentIsbnCount + 1;

    // Add suffix for duplicates (second copy gets -1, third gets -2, etc.)
    const suffix = currentIsbnCount > 0 ? `-${currentIsbnCount}` : "";
    const newFilename = `${book.isbn}${suffix}.jpg`;
    const newPath = join(batchDir, newFilename);

    // Skip if already renamed
    if (oldPath === newPath) {
      console.log(`  Already renamed: ${newFilename}`);
      return;
    }

    // Check if target exists
    if (existsSync(newPath)) {
      console.warn(
        `  Warning: ${newFilename} already exists, skipping rename of ${imageFiles[index]}`,
      );
      return;
    }

    try {
      renameSync(oldPath, newPath);
      console.log(`  Renamed: ${imageFiles[index]} -> ${newFilename}`);
    } catch (error) {
      console.error(`  Error renaming ${imageFiles[index]}: ${error}`);
    }
  });
}

// Generate SQL for books (unique ISBNs only)
function generateBooksSql(books: Book[], locationName: string): string {
  // Get unique books by ISBN (first occurrence only)
  const uniqueBooks = new Map<string, Book>();
  books.forEach((book) => {
    if (!uniqueBooks.has(book.isbn)) {
      uniqueBooks.set(book.isbn, book);
    }
  });

  const uniqueBooksArray = Array.from(uniqueBooks.values());

  const values = uniqueBooksArray
    .map((book) => {
      const id = book.id;
      const isbn = book.isbn.replace(/'/g, "''");
      const title = book.title.replace(/'/g, "''");
      const description = book.description.replace(/'/g, "''");
      const author = book.author.replace(/'/g, "''");

      const updatedImageUrl = `${IMAGE_BASE_PATH}/${locationName}-scans/${book.isbn}.jpg`;
      const imageUrl = updatedImageUrl.replace(/'/g, "''");

      return `  (${id}, '${isbn}', '${title}', '${description}', '${author}', '${imageUrl}', strftime('%s', 'now'))`;
    })
    .join(",\n");

  return `-- Insert books\nINSERT INTO books (id, isbn, title, description, author, image_url, created_at) VALUES\n${values};\n`;
}

// Generate copies for all books (including duplicates)
function generateCopies(books: Book[], locationId: number): Copy[] {
  const copies: Copy[] = [];

  // Track copy numbers for each unique book (by ISBN)
  const isbnCopyNumbers: Record<string, number> = {};

  // Create a map of ISBN to book ID (first occurrence)
  const isbnToBookId: Record<string, number> = {};
  books.forEach((book) => {
    if (!(book.isbn in isbnToBookId)) {
      isbnToBookId[book.isbn] = book.id;
    }
  });

  // Generate copies
  for (const book of books) {
    const qrCodeId = generateQrCodeId();
    const bookId = isbnToBookId[book.isbn]; // Use the first occurrence's book ID

    // Increment copy number for this ISBN
    if (!(book.isbn in isbnCopyNumbers)) {
      isbnCopyNumbers[book.isbn] = 0;
    }
    isbnCopyNumbers[book.isbn]++;
    const copyNumber = isbnCopyNumbers[book.isbn];

    copies.push({
      qrCodeId,
      bookId,
      copyNumber,
      status: "available",
      locationId,
    });
  }

  return copies;
}

// Generate SQL for copies
function generateCopiesSql(copies: Copy[]): string {
  const values = copies
    .map((copy) => {
      return `  ('${copy.qrCodeId}', ${copy.bookId}, ${copy.copyNumber}, '${copy.status}', ${copy.locationId})`;
    })
    .join(",\n");

  return `-- Insert book copies\nINSERT INTO book_copies (qr_code_id, book_id, copy_number, status, location_id) VALUES\n${values};\n`;
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: bun run generate-seed-from-json.ts <batch-number> <location> [id-offset]",
    );
    console.error("  batch-number: 1, 2, 3, etc.");
    console.error("  location: saga, elm, or cendana");
    console.error(
      "  id-offset: (optional) starting ID for books, default is 1",
    );
    console.error("\nExamples:");
    console.error("  bun run generate-seed-from-json.ts 1 elm");
    console.error("  bun run generate-seed-from-json.ts 2 elm 26");
    console.error("  bun run generate-seed-from-json.ts 3 elm 51");
    process.exit(1);
  }

  const batchNumber = args[0];
  const locationName = args[1].toLowerCase();
  const idOffset = args[2] ? parseInt(args[2]) : 1;

  if (!(locationName in LOCATION_MAP)) {
    console.error(`Invalid location: ${locationName}`);
    console.error("Valid options: saga, elm, cendana");
    process.exit(1);
  }

  const locationId = LOCATION_MAP[locationName];
  const batchDir = join(process.cwd(), "temp", `batch-${batchNumber}`);

  if (!existsSync(batchDir)) {
    console.error(`Batch directory does not exist: ${batchDir}`);
    process.exit(1);
  }

  console.log(
    `Processing batch ${batchNumber} for ${locationName} (location ID: ${locationId})...`,
  );

  // Find the JSON file
  const jsonFilePath = findJsonFile(batchDir);
  if (!jsonFilePath) {
    console.error(`No JSON file found in ${batchDir}`);
    process.exit(1);
  }

  console.log(`Reading books data from ${jsonFilePath}...`);
  const books = readBooksData(jsonFilePath);
  console.log(`Found ${books.length} book entries`);

  // Adjust book IDs with offset
  const adjustedBooks = books.map((book) => ({
    ...book,
    id: book.id - books[0].id + idOffset, // Normalize then apply offset
  }));

  console.log(
    `Adjusted book IDs: ${adjustedBooks[0].id} to ${adjustedBooks[adjustedBooks.length - 1].id}`,
  );

  // Rename images
  renameImagesByIsbn(batchDir, adjustedBooks);

  console.log("\nGenerating copies...");
  const copies = generateCopies(adjustedBooks, locationId);

  // Count unique books
  const uniqueIsbns = new Set(adjustedBooks.map((b) => b.isbn));
  console.log(
    `Generated ${copies.length} copies for ${uniqueIsbns.size} unique books at ${locationName} location`,
  );

  console.log("\nBuilding SQL...");
  const tempDir = join(process.cwd(), "temp");
  const outputFile = join(
    tempDir,

    `seed-from-json-batch-${batchNumber}-${locationName}.sql`,
  );

  const sql = [
    "-- Seed data for community library database",
    `-- Batch ${batchNumber} - Location: ${locationName} (ID: ${locationId})`,
    `-- Book IDs: ${adjustedBooks[0].id} to ${adjustedBooks[adjustedBooks.length - 1].id}`,
    `-- Processed: ${new Date().toISOString()}\n`,
    generateBooksSql(adjustedBooks, locationName),
    generateCopiesSql(copies),
    "-- No loans generated (all books are available)",
  ].join("\n");

  console.log(`Writing to ${outputFile}...`);
  writeFileSync(outputFile, sql);
  console.log("Done!");
  console.log(`\nSummary:`);
  console.log(`- Batch: ${batchNumber}`);
  console.log(`- Location: ${locationName} (ID: ${locationId})`);
  console.log(
    `- Book ID range: ${adjustedBooks[0].id} to ${adjustedBooks[adjustedBooks.length - 1].id}`,
  );
  console.log(`- Unique books: ${uniqueIsbns.size}`);
  console.log(
    `- Total copies: ${copies.length} (all at ${locationName} location)`,
  );
  console.log(`- Loans: 0 (all books available)`);
  console.log(`- Copy ID format: COPY-<6 random alphanumeric chars>`);
  console.log(
    `- Image path: ${IMAGE_BASE_PATH}/${locationName}-scans/<isbn>.jpg`,
  );
  console.log(`\nNext step: Run image processing script`);
  console.log(`  bun run process-images.ts ${batchNumber}`);
}

main();
