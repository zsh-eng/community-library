import type { InitData } from "@tma.js/init-data-node";
import { sign } from "@tma.js/init-data-node";
import { env, fetchMock } from "cloudflare:test";

export function mockAdminUser(isAdmin: boolean) {
  const status = isAdmin ? "administrator" : "left";
  fetchMock
    .get("https://api.telegram.org")
    .intercept({
      path: /\/bot.*\/getChatMember/,
      method: /GET|POST/,
    })
    .reply(200, {
      ok: true,
      result: {
        status,
        user: { id: 0, is_bot: false, first_name: "Test" },
      },
    });
}

// Telegram initData uses HMAC signing with the BOT_TOKEN, so we can mock it locally
export function makeInitData(
  user: {
    id: number;
    first_name: string;
    username?: string;
    last_name?: string;
  },
  botToken: string,
  overrides: Record<string, string> = {},
) {
  const payload: Record<string, string> = {
    user: JSON.stringify(user),
    ...overrides,
  };

  return sign(payload, botToken, new Date());
}

export function makeAuthHeader(initData: string) {
  return { Authorization: `tma ${initData}` };
}

export async function seedBook(params: {
  isbn: string;
  title: string;
  description: string;
  author: string;
  imageUrl?: string | null;
}) {
  await env.DATABASE.prepare(
    "INSERT INTO books (isbn, title, description, author, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(
      params.isbn,
      params.title,
      params.description,
      params.author,
      params.imageUrl ?? null,
      Date.now(),
    )
    .run();

  const row = await env.DATABASE.prepare("SELECT id FROM books WHERE isbn = ?")
    .bind(params.isbn)
    .first<{ id: number }>();

  return { id: row?.id ?? 0 };
}

export async function seedBookCopy(params: {
  qrCodeId: string;
  bookId: number;
  locationId?: number;
  copyNumber?: number;
  status?: string;
}) {
  await env.DATABASE.prepare(
    "INSERT INTO book_copies (qr_code_id, book_id, location_id, copy_number, status) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(
      params.qrCodeId,
      params.bookId,
      params.locationId ?? 1,
      params.copyNumber ?? 1,
      params.status ?? "available",
    )
    .run();
}

export async function seedLoan(params: {
  qrCodeId: string;
  telegramUserId: number;
  telegramUsername?: string | null;
  borrowedAt?: number;
  dueDate?: number;
  returnedAt?: number | null;
}) {
  const borrowedAt = params.borrowedAt ?? Date.now();
  const dueDate = params.dueDate ?? borrowedAt + 14 * 24 * 60 * 60 * 1000;

  await env.DATABASE.prepare(
    "INSERT INTO loans (qr_code_id, telegram_user_id, telegram_username, borrowed_at, due_date, returned_at, last_reminder_sent) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      params.qrCodeId,
      params.telegramUserId,
      params.telegramUsername ?? null,
      borrowedAt,
      dueDate,
      params.returnedAt ?? null,
      null,
    )
    .run();
}

export function getTelegramUser(initData: InitData) {
  return initData.user;
}
