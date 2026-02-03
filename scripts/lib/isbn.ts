/**
 * ISBN normalization and validation utilities
 */

/**
 * Normalize ISBN to ISBN-13 format (remove hyphens, ensure 13 digits)
 * Returns null if the ISBN cannot be normalized
 */
export function normalizeISBN(isbn: string): string | null {
  if (!isbn || typeof isbn !== "string") {
    return null;
  }

  // Remove all non-digit characters (except X for ISBN-10 check digit)
  const cleaned = isbn.toUpperCase().replace(/[^0-9X]/g, "");

  // Handle ISBN-10
  if (cleaned.length === 10) {
    return convertISBN10to13(cleaned);
  }

  // Handle ISBN-13
  if (cleaned.length === 13) {
    if (isValidISBN13(cleaned)) {
      return cleaned;
    }
    return null;
  }

  return null;
}

/**
 * Convert ISBN-10 to ISBN-13
 */
function convertISBN10to13(isbn10: string): string | null {
  if (isbn10.length !== 10) {
    return null;
  }

  // Validate ISBN-10 check digit first
  if (!isValidISBN10(isbn10)) {
    return null;
  }

  // Add 978 prefix and recalculate check digit
  const base = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
}

/**
 * Validate ISBN-10 check digit
 */
function isValidISBN10(isbn: string): boolean {
  if (isbn.length !== 10) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i]);
    if (isNaN(digit)) {
      return false;
    }
    sum += digit * (10 - i);
  }

  // Handle X as check digit (value 10)
  const lastChar = isbn[9];
  const lastValue = lastChar === "X" ? 10 : parseInt(lastChar);
  if (isNaN(lastValue) && lastChar !== "X") {
    return false;
  }

  sum += lastValue;
  return sum % 11 === 0;
}

/**
 * Validate ISBN-13 check digit
 */
function isValidISBN13(isbn: string): boolean {
  if (isbn.length !== 13) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i]);
    if (isNaN(digit)) {
      return false;
    }
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return parseInt(isbn[12]) === checkDigit;
}

/**
 * Check if a string looks like it could be an ISBN
 * (has enough digits, starts with valid prefix, etc.)
 */
export function looksLikeISBN(str: string): boolean {
  const digits = str.replace(/\D/g, "");
  // ISBN-10 or ISBN-13
  if (digits.length !== 10 && digits.length !== 13) {
    return false;
  }

  // ISBN-13 should start with 978 or 979
  if (digits.length === 13) {
    return digits.startsWith("978") || digits.startsWith("979");
  }

  return true;
}

/**
 * Format ISBN-13 with hyphens for display (basic format)
 */
export function formatISBN(isbn: string): string {
  if (isbn.length !== 13) {
    return isbn;
  }
  // Simple format: 978-X-XXXXX-XXX-X
  return `${isbn.slice(0, 3)}-${isbn.slice(3, 4)}-${isbn.slice(4, 9)}-${isbn.slice(9, 12)}-${isbn.slice(12)}`;
}
