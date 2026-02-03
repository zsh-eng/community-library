/**
 * CSV read/write utilities
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Parse CSV string into array of objects
 */
export function parseCSV<T extends Record<string, string>>(
  content: string
): T[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCSVLine(lines[0]);
  const results: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    results.push(row as T);
  }

  return results;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

/**
 * Convert array of objects to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: string[]
): string {
  if (data.length === 0) {
    return "";
  }

  const cols = headers || Object.keys(data[0]);
  const lines: string[] = [cols.join(",")];

  for (const row of data) {
    const values = cols.map((col) => {
      const value = row[col];
      const str = value === null || value === undefined ? "" : String(value);

      // Escape quotes and wrap in quotes if needed
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });

    lines.push(values.join(","));
  }

  return lines.join("\n");
}

/**
 * Read and parse a CSV file
 */
export async function readCSV<T extends Record<string, string>>(
  filePath: string
): Promise<T[]> {
  const content = await readFile(filePath, "utf-8");
  return parseCSV<T>(content);
}

/**
 * Write array of objects to CSV file
 */
export async function writeCSV<T extends Record<string, unknown>>(
  filePath: string,
  data: T[],
  headers?: string[]
): Promise<void> {
  // Ensure directory exists
  await mkdir(dirname(filePath), { recursive: true });

  const content = toCSV(data, headers);
  await writeFile(filePath, content, "utf-8");
}
