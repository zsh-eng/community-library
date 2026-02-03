/**
 * Generate QR code URLs for printing
 *
 * Usage: bun run scripts/generate-qr.ts <count> <output-file>
 * Example: bun run scripts/generate-qr.ts 500 qr-codes.txt
 */

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars: 0, O, I, 1

function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

function generateQrUrl(copyId: string): string {
  return `https://t.me/nusc_library_bot?start=borrow_${copyId}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: bun run scripts/generate-qr.ts <count> <output-file>");
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
    codes.add(`COPY-${generateCode()}`);
  }

  // Generate URLs
  const urls = Array.from(codes).map(generateQrUrl);

  // Write to file
  await Bun.write(outputFile, urls.join("\n") + "\n");

  console.log(`Generated ${count} QR code URLs to ${outputFile}`);
  console.log(`Sample: ${urls[0]}`);
}

main();
