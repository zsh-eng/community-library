import type { Location } from "@/types";

export type LocationScanResult =
  | { type: "location" }
  | { type: "book"; bookCode: string }
  | { type: "invalid" };

export function extractBookQrParam(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const startapp = url.searchParams.get("startapp");
    return startapp ? startapp.trim() : "";
  } catch {
    const queryIndex = trimmed.indexOf("?");
    const query = queryIndex >= 0 ? trimmed.slice(queryIndex + 1) : trimmed;
    const params = new URLSearchParams(query);
    const startapp = params.get("startapp");
    return startapp ? startapp.trim() : "";
  }
}

export function isBookQr(text: string): boolean {
  return extractBookQrParam(text) !== "";
}

/**
 * Check if the scanned location matches the expected location.
 * Matches by name (case-insensitive).
 */
export function isValidLocation(scannedText: string, expected: Location): boolean {
  return scannedText.trim().toLowerCase() === expected.name.trim().toLowerCase();
}

export function classifyLocationScan(
  scannedText: string,
  expected: Location,
): LocationScanResult {
  const trimmed = scannedText.trim();
  const bookCode = extractBookQrParam(trimmed);
  if (bookCode) {
    return { type: "book", bookCode };
  }

  if (isValidLocation(trimmed, expected)) {
    return { type: "location" };
  }

  return { type: "invalid" };
}
