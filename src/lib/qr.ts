import type { Location } from "@/types";
import {
  BOOK_QR_CHARSET,
  BOOK_QR_CODE_LENGTH,
  BOOK_QR_PREFIX,
  extractBookQrParam,
  isValidBookCode,
  parseBookQrLink,
} from "@shared/qr";

export type LocationScanResult =
  | { type: "location" }
  | { type: "book"; bookCode: string }
  | { type: "invalid" };

export {
  BOOK_QR_CHARSET,
  BOOK_QR_CODE_LENGTH,
  BOOK_QR_PREFIX,
  extractBookQrParam,
  isValidBookCode,
  parseBookQrLink,
};

export function isBookQr(text: string): boolean {
  return extractBookQrParam(text) !== "";
}

/**
 * Check if the scanned location matches the expected location.
 * Matches by name (case-insensitive).
 */
export function isValidLocation(
  scannedText: string,
  expected: Location,
): boolean {
  return (
    scannedText.trim().toLowerCase() === expected.name.trim().toLowerCase()
  );
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
