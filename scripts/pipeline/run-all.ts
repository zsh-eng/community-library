#!/usr/bin/env bun
/**
 * Run Complete Pipeline
 *
 * Orchestrates all pipeline stages in sequence:
 * 1. Extract - Read batch metadata.json files
 * 2. Validate - Normalize and validate ISBNs
 * 3. Deduplicate - Merge by ISBN across all batches
 * 4. Process Images - Compress to webp, rename by ISBN
 * 5. Generate Output - Create seed-dev.sql and seed-prod.sql
 *
 * Usage:
 *   RAW_DATA_PATH=~/Downloads/library-images bun run scripts/pipeline/run-all.ts
 *
 * Or with default path:
 *   bun run scripts/pipeline/run-all.ts
 */

import { join } from "path";
import { existsSync } from "fs";
import type { PipelineConfig } from "../lib/types";

import { extract } from "./01-extract";
import { validate } from "./02-validate";
import { deduplicate } from "./03-deduplicate";
import { processImages } from "./04-process-images";
import { generateOutput } from "./05-generate-output";

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Community Library Data Pipeline                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Parse arguments
  const args = process.argv.slice(2);
  const skipImages = args.includes("--skip-images");
  const stageArg = args.find((a) => a.startsWith("--stage="));
  const specificStage = stageArg ? parseInt(stageArg.split("=")[1]) : null;

  // Configuration
  const rawDataPath =
    process.env.RAW_DATA_PATH ||
    join(process.env.HOME || "", "Downloads/library-images");
  const outputPath = join(process.cwd(), "output");
  const imageOutputPath = join(outputPath, "images");

  const config: PipelineConfig = {
    rawDataPath,
    outputPath,
    imageOutputPath,
  };

  console.log("Configuration:");
  console.log(`  Raw data: ${rawDataPath}`);
  console.log(`  Output:   ${outputPath}`);
  console.log(`  Images:   ${imageOutputPath}`);

  if (!existsSync(rawDataPath)) {
    console.error(`\n❌ Raw data path does not exist: ${rawDataPath}`);
    console.error(`\nSet RAW_DATA_PATH environment variable to the location of your library-images folder.`);
    console.error(`Example: RAW_DATA_PATH=~/Downloads/library-images bun run scripts/pipeline/run-all.ts`);
    process.exit(1);
  }

  console.log("\n" + "─".repeat(60) + "\n");

  const startTime = Date.now();

  try {
    // Stage 1: Extract
    if (!specificStage || specificStage === 1) {
      await extract(config);
      console.log("\n" + "─".repeat(60) + "\n");
    }

    // Stage 2: Validate
    if (!specificStage || specificStage === 2) {
      await validate(config);
      console.log("\n" + "─".repeat(60) + "\n");
    }

    // Stage 3: Deduplicate
    if (!specificStage || specificStage === 3) {
      await deduplicate(config);
      console.log("\n" + "─".repeat(60) + "\n");
    }

    // Stage 4: Process Images
    if (!specificStage || specificStage === 4) {
      if (skipImages) {
        console.log("=== Stage 4: Process Images (SKIPPED) ===\n");
      } else {
        await processImages(config);
        console.log("\n" + "─".repeat(60) + "\n");
      }
    }

    // Stage 5: Generate Output
    if (!specificStage || specificStage === 5) {
      await generateOutput(config);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n" + "═".repeat(60));
    console.log(`✅ Pipeline complete in ${elapsed}s`);
    console.log("═".repeat(60));

    // Summary
    console.log("\nGenerated files:");
    console.log(`  ${join(outputPath, "books_master.csv")} - All unique books`);
    console.log(`  ${join(outputPath, "seed-dev.sql")}     - For local development`);
    console.log(`  ${join(outputPath, "seed-prod.sql")}    - For production`);

    if (!skipImages) {
      console.log(`  ${imageOutputPath}/covers/       - Processed images`);
    }

    console.log("\nNext steps:");
    console.log("  1. Review books_master.csv for any issues");
    console.log("  2. Apply to local: pnpm dlx wrangler d1 execute community-library-db --local --file=./output/seed-dev.sql");
    console.log("  3. Apply to prod:  pnpm dlx wrangler d1 execute community-library-db --remote --file=./output/seed-prod.sql");

    if (!skipImages) {
      console.log("  4. Copy images to CDN repo: cp -r output/images/covers/ ../community-library-images/assets/covers/");
      console.log("  5. Push CDN repo: cd ../community-library-images && git add . && git commit -m 'Add covers' && git push");
    }
  } catch (error) {
    console.error("\n❌ Pipeline failed:", error);
    process.exit(1);
  }
}

// Help text
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Community Library Data Pipeline

Usage:
  bun run scripts/pipeline/run-all.ts [options]

Options:
  --skip-images    Skip image processing (Stage 4)
  --stage=N        Run only stage N (1-5)
  --help, -h       Show this help

Environment:
  RAW_DATA_PATH    Path to library-images folder (default: ~/Downloads/library-images)

Stages:
  1. Extract       Read batch metadata.json files
  2. Validate      Normalize and validate ISBNs
  3. Deduplicate   Merge by ISBN across all batches
  4. Process       Compress images to webp, rename by ISBN
  5. Generate      Create seed-dev.sql and seed-prod.sql

Examples:
  # Run full pipeline
  RAW_DATA_PATH=~/Downloads/library-images bun run scripts/pipeline/run-all.ts

  # Skip image processing
  bun run scripts/pipeline/run-all.ts --skip-images

  # Run only deduplication stage
  bun run scripts/pipeline/run-all.ts --stage=3
`);
  process.exit(0);
}

main();
