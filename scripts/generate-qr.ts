/**
 * Generate QR code URLs for printing
 *
 * Usage: bun run scripts/generate-qr.ts <count> <output-file>
 * Example: bun run scripts/generate-qr.ts 500 qr-codes.txt
 */

import {
  BOOK_QR_CHARSET,
  BOOK_QR_CODE_LENGTH,
  BOOK_QR_PREFIX,
  isValidBookCode,
} from "../src/lib/qr";

function generateCode(length = BOOK_QR_CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += BOOK_QR_CHARSET[Math.floor(Math.random() * BOOK_QR_CHARSET.length)];
  }
  return code;
}

function generateQrUrl(copyId: string): string {
  return `https://t.me/nusc_library_bot?startapp=${copyId}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: bun run scripts/generate-qr.ts <count> <output-file>",
    );
    console.error("Example: bun run scripts/generate-qr.ts 500 qr-codes.txt");
    process.exit(1);
  }

  const count = parseInt(args[0], 10);
  const outputFile = args[1];

  if (isNaN(count) || count <= 0) {
    console.error("Error: count must be a positive number");
    process.exit(1);
  }

  const codes = new Set<string>();

  // Generate unique codes
  while (codes.size < count) {
    const code = `${BOOK_QR_PREFIX}${generateCode()}`;
    if (!isValidBookCode(code)) {
      throw new Error(`Generated invalid book code: ${code}`);
    }
    codes.add(code);
  }

  // Generate URLs
  const urls = Array.from(codes).map(generateQrUrl);

  // Write to file
  await Bun.write(outputFile, urls.join("\n") + "\n");

  console.log(`Generated ${count} QR code URLs to ${outputFile}`);
  console.log(`Sample: ${urls[0]}`);
}

main();
