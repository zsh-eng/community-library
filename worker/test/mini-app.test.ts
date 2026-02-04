import { SELF } from "cloudflare:test";
import { describe, beforeEach, expect, it } from "vitest";
import {
  makeAuthHeader,
  makeInitData,
  mockAdminUser,
  seedBook,
  seedBookCopy,
  seedLoan,
} from "./helpers";

const botToken = "test-bot-token";

describe("mini app api", () => {
  beforeEach(() => {
    mockAdminUser(true);
  });

  it("returns user data and admin flag", async () => {
    const initData = makeInitData(
      { id: 123, first_name: "Ada", username: "ada" },
      botToken,
    );

    const response = await SELF.fetch("http://example.com/api/miniapp/me", {
      headers: makeAuthHeader(initData),
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      user: { id: number; firstName: string; username?: string };
      isAdmin: boolean;
    };
    expect(data.user.id).toBe(123);
    expect(data.user.firstName).toBe("Ada");
    expect(data.user.username).toBe("ada");
    expect(data.isAdmin).toBe(true);
  });

  it("rejects missing auth header", async () => {
    const response = await SELF.fetch("http://example.com/api/miniapp/me");
    expect(response.status).toBe(401);
    const data = (await response.json()) as { error: string };
    expect(data.error).toBe("Unauthorized");
  });

  it("returns locations", async () => {
    const initData = makeInitData(
      { id: 123, first_name: "Ada" },
      botToken,
    );

    const response = await SELF.fetch(
      "http://example.com/api/miniapp/locations",
      {
        headers: makeAuthHeader(initData),
      },
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as { locations: { id: number }[] };
    expect(Array.isArray(data.locations)).toBe(true);
    expect(data.locations.length).toBeGreaterThan(0);
  });

  it("returns active loans for user", async () => {
    const initData = makeInitData(
      { id: 321, first_name: "Linus" },
      botToken,
    );

    const response = await SELF.fetch("http://example.com/api/miniapp/loans", {
      headers: makeAuthHeader(initData),
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { loans: unknown[] };
    expect(Array.isArray(data.loans)).toBe(true);
  });

  it("returns 401 for invalid init data", async () => {
    const response = await SELF.fetch("http://example.com/api/miniapp/loans", {
      headers: makeAuthHeader("invalid-data"),
    });

    expect(response.status).toBe(401);
    const data = (await response.json()) as { error: string };
    expect(data.error).toBe("Invalid init data");
  });


  it("borrows a book copy", async () => {
    const book = await seedBook({
      isbn: "isbn-123",
      title: "Book A",
      description: "Test",
      author: "Author",
    });
    await seedBookCopy({
      qrCodeId: "copy-1",
      bookId: book.id,
      locationId: 1,
      copyNumber: 1,
    });

    const initData = makeInitData(
      { id: 456, first_name: "Sam", username: "sam" },
      botToken,
    );

    const response = await SELF.fetch(
      "http://example.com/api/miniapp/books/copy-1/borrow",
      {
        method: "POST",
        headers: makeAuthHeader(initData),
      },
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      success: boolean;
      loan?: { id: number };
      book?: { title: string };
      copyNumber?: number;
    };
    expect(data.success).toBe(true);
    expect(data.loan?.id).toBeDefined();
    expect(data.book?.title).toBe("Book A");
    expect(data.copyNumber).toBe(1);
  });

  it("returns an active loan", async () => {
    const book = await seedBook({
      isbn: "isbn-456",
      title: "Book B",
      description: "Test",
      author: "Author",
    });
    await seedBookCopy({
      qrCodeId: "copy-2",
      bookId: book.id,
      locationId: 1,
      copyNumber: 1,
    });
    await seedLoan({
      qrCodeId: "copy-2",
      telegramUserId: 777,
    });

    const initData = makeInitData(
      { id: 777, first_name: "Rin", username: "rin" },
      botToken,
    );

    const response = await SELF.fetch(
      "http://example.com/api/miniapp/books/copy-2/return",
      {
        method: "POST",
        headers: makeAuthHeader(initData),
      },
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      success: boolean;
      book?: { title: string };
      returnedAt?: number;
    };
    expect(data.success).toBe(true);
    expect(data.book?.title).toBe("Book B");
    expect(data.returnedAt).toBeDefined();
  });

  it("adds a book copy when admin", async () => {
    const book = await seedBook({
      isbn: "isbn-789",
      title: "Book C",
      description: "Test",
      author: "Author",
    });

    const initData = makeInitData(
      { id: 999, first_name: "Jo", username: "jo" },
      botToken,
    );

    const response = await SELF.fetch(
      `http://example.com/api/miniapp/books/${book.id}/copies`,
      {
        method: "POST",
        headers: {
          ...makeAuthHeader(initData),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qrCodeId: "copy-3", locationId: 1 }),
      },
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      success: boolean;
      copy?: { qrCodeId: string; copyNumber: number };
    };
    expect(data.success).toBe(true);
    expect(data.copy?.qrCodeId).toBe("copy-3");
    expect(data.copy?.copyNumber).toBe(1);
  });
});
