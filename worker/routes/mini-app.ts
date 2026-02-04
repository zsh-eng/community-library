import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as schema from "../db/schema";
import {
  addBookCopy,
  borrowBook,
  getAllLocations,
  getUserActiveLoans,
  returnBook,
} from "../lib/book";
import { adminCheck, requireAdmin } from "../middleware/admin-auth";
import { telegramAuth } from "../middleware/telegram-auth";

const BOOK_QR_PREFIX = "COPY-";
const BOOK_QR_CODE_LENGTH = 6;
const BOOK_QR_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BOOK_QR_CODE_REGEX = new RegExp(
  `^${BOOK_QR_PREFIX}[${BOOK_QR_CHARSET}]{${BOOK_QR_CODE_LENGTH}}$`,
);

function extractBookCodeFromLink(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!/(^|\/\/)t\.me\//i.test(trimmed)) return null;

  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    const startapp = url.searchParams.get("startapp");
    if (!startapp) return null;
    const code = startapp.trim();
    return BOOK_QR_CODE_REGEX.test(code) ? code : null;
  } catch {
    const queryIndex = trimmed.indexOf("?");
    const query = queryIndex >= 0 ? trimmed.slice(queryIndex + 1) : trimmed;
    const params = new URLSearchParams(query);
    const startapp = params.get("startapp");
    if (!startapp) return null;
    const code = startapp.trim();
    return BOOK_QR_CODE_REGEX.test(code) ? code : null;
  }
}

/**
 * Mini App API routes.
 * All routes require Telegram initData authentication.
 *
 * Routes are defined with fluent chaining to ensure proper
 * type inference for the Hono client.
 */
export const miniApp = new Hono<{ Bindings: Env }>()
  .use("*", telegramAuth)
  .get("/me", adminCheck, async (c) => {
    const initData = c.get("initData");
    const user = initData.user;
    const isAdmin = c.get("isAdmin");

    if (!user) {
      return c.json({ error: "User not found in init data" }, 400);
    }

    return c.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        photoUrl: user.photo_url,
      },
      isAdmin,
    });
  })
  .get("/locations", async (c) => {
    const db = drizzle(c.env.DATABASE, { schema });
    const locations = await getAllLocations(db);
    return c.json({ locations });
  })
  .get("/loans", async (c) => {
    const initData = c.get("initData");
    const telegramUserId = initData.user?.id;

    if (!telegramUserId) {
      return c.json({ error: "User ID not found in init data" }, 400);
    }

    const db = drizzle(c.env.DATABASE, { schema });
    const loans = await getUserActiveLoans(db, telegramUserId);

    return c.json({ loans });
  })
  .post("/books/:qrCodeId/borrow", async (c) => {
    const initData = c.get("initData");
    const telegramUserId = initData.user?.id;
    const telegramUsername = initData.user?.username;

    if (!telegramUserId) {
      return c.json({ error: "User ID not found in init data" }, 400);
    }

    const { qrCodeId } = c.req.param();
    const db = drizzle(c.env.DATABASE, { schema });

    const result = await borrowBook(
      db,
      qrCodeId,
      telegramUserId,
      telegramUsername,
    );

    if (result.success && result.loan && result.book) {
      return c.json({
        success: true,
        loan: {
          id: result.loan.id,
          borrowedAt: result.loan.borrowedAt,
          dueDate: result.loan.dueDate,
        },
        book: {
          title: result.book.title,
          author: result.book.author,
          imageUrl: result.book.imageUrl,
        },
        copyNumber: result.copyNumber,
      });
    }

    return c.json(
      { success: false, error: result.error || "Failed to borrow book" },
      400,
    );
  })
  .post("/books/:qrCodeId/return", async (c) => {
    const initData = c.get("initData");
    const telegramUserId = initData.user?.id;

    if (!telegramUserId) {
      return c.json({ error: "User ID not found in init data" }, 400);
    }

    const { qrCodeId } = c.req.param();
    const db = drizzle(c.env.DATABASE, { schema });

    const result = await returnBook(db, qrCodeId, telegramUserId);

    if (result.success && result.book) {
      return c.json({
        success: true,
        book: {
          title: result.book.title,
          author: result.book.author,
        },
        borrowedAt: result.borrowedAt,
        returnedAt: result.returnedAt,
      });
    }

    return c.json(
      { success: false, error: result.error || "Failed to return book" },
      400,
    );
  })
  .post("/books/:bookId/copies", adminCheck, requireAdmin, async (c) => {
    const { bookId } = c.req.param();
    const body = await c.req.json<{ qrCodeId: string; locationId: number }>();

    if (!body.qrCodeId || !body.locationId) {
      return c.json(
        { success: false, error: "qrCodeId and locationId are required" },
        400,
      );
    }

    const extractedCode = extractBookCodeFromLink(body.qrCodeId);
    if (!extractedCode) {
      return c.json(
        {
          success: false,
          error:
            "qrCodeId must be the full Telegram mini app link including startapp=COPY-...",
        },
        400,
      );
    }

    const db = drizzle(c.env.DATABASE, { schema });
    const result = await addBookCopy(
      db,
      parseInt(bookId),
      body.locationId,
      extractedCode,
    );

    if (result.success) {
      return c.json({ success: true, copy: result.copy });
    }

    return c.json({ success: false, error: result.error }, 400);
  });
