import type { Location } from "@/types";

export type LocationScanResult =
  | { type: "location" }
  | { type: "book"; bookCode: string }
  | { type: "invalid" };

export const BOOK_QR_PREFIX = "COPY-";
export const BOOK_QR_CODE_LENGTH = 6;
export const BOOK_QR_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BOOK_QR_CODE_REGEX = new RegExp(
  `^${BOOK_QR_PREFIX}[${BOOK_QR_CHARSET}]{${BOOK_QR_CODE_LENGTH}}$`,
);

export function isValidBookCode(text: string): boolean {
  return BOOK_QR_CODE_REGEX.test(text.trim());
}

export function extractBookQrParam(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const startapp = url.searchParams.get("startapp");
    if (!startapp) return "";
    const trimmedStartapp = startapp.trim();
    return isValidBookCode(trimmedStartapp) ? trimmedStartapp : "";
  } catch {
    const queryIndex = trimmed.indexOf("?");
    const query = queryIndex >= 0 ? trimmed.slice(queryIndex + 1) : trimmed;
    const params = new URLSearchParams(query);
    const startapp = params.get("startapp");
    if (!startapp) return "";
    const trimmedStartapp = startapp.trim();
    return isValidBookCode(trimmedStartapp) ? trimmedStartapp : "";
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
