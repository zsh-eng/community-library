import { spawnSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

const LOCATION_MAP: Record<string, number> = {
  saga: 1,
  elm: 2,
  cendana: 3,
};

// Resize images to 300px width using mogrify
function resizeImages(batchDir: string): void {
  console.log("\nResizing images to 300px width...");

  const result = spawnSync(
    "mogrify",
    ["-resize", "300x", "-filter", "Lanczos", "*.jpg"],
    {
      cwd: batchDir,
      shell: true,
      stdio: "inherit",
    },
  );

  if (result.error) {
    console.error(`Error running mogrify: ${result.error}`);
    throw result.error;
  }

  if (result.status !== 0) {
    console.error(`mogrify exited with code ${result.status}`);
    throw new Error(`mogrify failed with status ${result.status}`);
  }

  console.log("✓ Images resized successfully");
}

// Compress images to target size using jpegoptim
function compressImages(batchDir: string, maxSizeKb: number = 30): void {
  console.log(`\nCompressing images to max ${maxSizeKb}KB...`);

  const result = spawnSync("jpegoptim", ["--size", `${maxSizeKb}k`, "*.jpg"], {
    cwd: batchDir,
    shell: true,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Error running jpegoptim: ${result.error}`);
    throw result.error;
  }

  if (result.status !== 0) {
    console.error(`jpegoptim exited with code ${result.status}`);
    throw new Error(`jpegoptim failed with status ${result.status}`);
  }

  console.log("✓ Images compressed successfully");
}

// Check if required tools are installed
function checkRequiredTools(): void {
  console.log("Checking for required tools...");

  // Check mogrify
  const mogrifyCheck = spawnSync("which", ["mogrify"], {
    encoding: "utf-8",
  });
  if (mogrifyCheck.status !== 0) {
    console.error("Error: mogrify is not installed");
    console.error("Install with: brew install imagemagick");
    process.exit(1);
  }
  console.log("✓ mogrify found");

  // Check jpegoptim
  const jpegoptimCheck = spawnSync("which", ["jpegoptim"], {
    encoding: "utf-8",
  });
  if (jpegoptimCheck.status !== 0) {
    console.error("Error: jpegoptim is not installed");
    console.error("Install with: brew install jpegoptim");
    process.exit(1);
  }
  console.log("✓ jpegoptim found");
}

// Count images in directory
function countImages(batchDir: string): number {
  const files = readdirSync(batchDir);
  return files.filter((f) => f.toLowerCase().endsWith(".jpg")).length;
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: bun run process-images.ts <batch-number> <location>");
    console.error("  batch-number: 1, 2, 3, etc.");
    console.error("  location: saga, elm, or cendana");
    console.error("\nExamples:");
    console.error("  bun run process-images.ts 1 elm");
    console.error("  bun run process-images.ts 2 elm");
    console.error("  bun run process-images.ts 3 elm");
    process.exit(1);
  }

  const batchNumber = args[0];
  const locationName = args[1].toLowerCase();

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
    `Processing images for batch ${batchNumber} - ${locationName} (location ID: ${locationId})...`,
  );

  // Check for required tools
  checkRequiredTools();

  const imageCount = countImages(batchDir);
  console.log(`\nFound ${imageCount} images to process`);

  if (imageCount === 0) {
    console.warn("No images found in directory!");
    process.exit(0);
  }

  try {
    // Resize images
    resizeImages(batchDir);

    // Compress images
    compressImages(batchDir, 30);

    console.log("\n✅ Image processing complete!");
    console.log(`Processed ${imageCount} images in ${batchDir}`);
    console.log(`\nImages are ready to be uploaded to:`);
    console.log(
      `  https://cdn.jsdelivr.net/gh/zsh-eng/community-library-images@main/assets/books/${locationName}-scans/`,
    );
  } catch (error) {
    console.error("\n❌ Image processing failed!");
    console.error(error);
    process.exit(1);
  }
}

main();
