import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a string to a URL-friendly slug
 * @param text - The text to slugify
 * @returns A slugified string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
}

/**
 * Generates a readable book URL slug with ID
 * @param title - The book title
 * @param id - The book ID
 * @returns A slug in format "book-title-id"
 */
export function generateBookSlug(title: string, id: number): string {
  const slug = slugify(title);
  return `${slug}-${id}`;
}

/**
 * Extracts the book ID from a slug
 * @param slug - The URL slug (e.g., "book-title-123" or just "123")
 * @returns The extracted ID or null if not found
 */
export function extractIdFromSlug(slug: string): string | null {
  // Check if the entire slug is just a number (plain ID format)
  if (/^\d+$/.test(slug)) {
    return slug;
  }

  // Otherwise, extract ID from the end of the slug
  const match = slug.match(/-(\d+)$/);
  return match ? match[1] : null;
}
