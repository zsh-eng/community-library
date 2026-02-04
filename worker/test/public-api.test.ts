import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { seedBook, seedBookCopy, seedLoan } from "./helpers";

describe("public api", () => {
  it("returns book list without description", async () => {
    await seedBook({
      isbn: "isbn-list",
      title: "List Book",
      description: "Hidden",
      author: "Author",
    });

    const response = await SELF.fetch("http://example.com/api/books");
    expect(response.status).toBe(200);
    const data = (await response.json()) as { books: { description?: string }[] };
    expect(Array.isArray(data.books)).toBe(true);
    expect(data.books[0]?.description).toBeUndefined();
  });

  it("returns book details", async () => {
    const book = await seedBook({
      isbn: "isbn-details",
      title: "Detail Book",
      description: "Shown",
      author: "Author",
    });
    await seedBookCopy({
      qrCodeId: "copy-detail",
      bookId: book.id,
      locationId: 1,
      copyNumber: 1,
    });
    await seedLoan({
      qrCodeId: "copy-detail",
      telegramUserId: 111,
    });

    const response = await SELF.fetch(
      `http://example.com/api/books/${book.id}`,
    );
    expect(response.status).toBe(200);
    const data = (await response.json()) as { book: { id: number } };
    expect(data.book.id).toBe(book.id);
  });

  it("returns 404 for missing book", async () => {
    const response = await SELF.fetch("http://example.com/api/books/999999");
    expect(response.status).toBe(404);
  });

  it("returns copy details", async () => {
    const book = await seedBook({
      isbn: "isbn-copy",
      title: "Copy Book",
      description: "Shown",
      author: "Author",
    });
    await seedBookCopy({
      qrCodeId: "copy-lookup",
      bookId: book.id,
      locationId: 1,
      copyNumber: 2,
    });

    const response = await SELF.fetch(
      "http://example.com/api/copies/copy-lookup",
    );
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      book: { id: number };
      copy: { qrCodeId: string; copyNumber: number };
    };
    expect(data.book.id).toBe(book.id);
    expect(data.copy.qrCodeId).toBe("copy-lookup");
    expect(data.copy.copyNumber).toBe(2);
  });

  it("returns 404 for missing copy", async () => {
    const response = await SELF.fetch("http://example.com/api/copies/missing");
    expect(response.status).toBe(404);
  });
});
