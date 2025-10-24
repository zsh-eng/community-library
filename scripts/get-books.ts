import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import "dotenv/config";
import { existsSync } from "fs";
import { appendFile } from "fs/promises";

// ANSI color codes for logging
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

interface BookData {
  isbn: string;
  title: string;
  author: string;
  description: string;
  image_url: string;
}

function parseBookData(text: string): BookData | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (
        parsed.isbn &&
        parsed.title &&
        parsed.author &&
        parsed.description &&
        parsed.image_url
      ) {
        return {
          isbn: parsed.isbn,
          title: parsed.title,
          author: parsed.author,
          description: parsed.description,
          image_url: parsed.image_url,
        };
      }
    }

    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function fetchBookData(bookName: string): Promise<BookData | null> {
  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: `Search for the book "${bookName}" and provide accurate information in the following JSON format:

{
  "isbn": "ISBN-13 number",
  "title": "Full title of the book",
  "author": "Author name(s)",
  "description": "A concise description (1-2 sentences)",
  "image_url": "URL to book cover image"
}

For the image_url, prefer Open Library covers in this format: https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg

Make sure all information is accurate and the ISBN is a valid ISBN-13.
Return ONLY the JSON object, no additional text.`,
      tools: {
        google_search: google.tools.googleSearch({}),
        url_context: google.tools.urlContext({}),
      },
    });

    const bookData = parseBookData(text);
    return bookData;
  } catch (error) {
    console.error(
      `${colors.red}Error fetching data for "${bookName}":${colors.reset}`,
      error,
    );
    return null;
  }
}

async function main() {
  const booksFilePath = "scripts/books.txt";
  const outputFilePath = "scripts/books-data.jsonl";

  // Read the books list
  console.log(
    `${colors.cyan}${colors.bright}📚 Reading books list...${colors.reset}`,
  );
  const booksContent = await Bun.file(booksFilePath).text();
  const books = booksContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  console.log(
    `${colors.green}Found ${books.length} books to process${colors.reset}\n`,
  );

  // Create or clear the output file
  if (!existsSync(outputFilePath)) {
    await Bun.write(outputFilePath, "");
  }

  let successCount = 0;
  let failureCount = 0;

  // Process each book
  for (let i = 0; i < books.length; i++) {
    const bookName = books[i];
    const progress = `[${i + 1}/${books.length}]`;

    console.log(
      `${colors.blue}${colors.bright}${progress}${colors.reset} ${colors.yellow}Fetching data for: ${bookName}${colors.reset}`,
    );

    const bookData = await fetchBookData(bookName);

    if (bookData) {
      // Append to JSONL file
      const jsonLine = JSON.stringify(bookData) + "\n";
      await appendFile(outputFilePath, jsonLine);

      console.log(
        `${colors.green}${colors.bright}✓${colors.reset} ${colors.green}Successfully fetched: ${bookData.title}${colors.reset}`,
      );
      console.log(`  ${colors.cyan}Author:${colors.reset} ${bookData.author}`);
      console.log(`  ${colors.cyan}ISBN:${colors.reset} ${bookData.isbn}\n`);
      successCount++;
    } else {
      console.log(
        `${colors.red}${colors.bright}✗${colors.reset} ${colors.red}Failed to fetch data${colors.reset}\n`,
      );
      failureCount++;
    }

    // Add a small delay to avoid rate limiting
    if (i < books.length - 1) {
      await Bun.sleep(1000);
    }
  }

  // Final summary
  console.log(
    `${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
  );
  console.log(`${colors.cyan}${colors.bright}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✓ Success: ${successCount}${colors.reset}`);
  if (failureCount > 0) {
    console.log(`  ${colors.red}✗ Failed: ${failureCount}${colors.reset}`);
  }
  console.log(`  ${colors.blue}📄 Output: ${outputFilePath}${colors.reset}`);
  console.log(
    `${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
  );
}

main().catch(console.error);
