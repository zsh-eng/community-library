import { zValidator } from "@hono/zod-validator";
import { extractBookCodeFromLink } from "@shared/qr";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { z } from "zod";
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
  .post(
    "/books/:bookId/copies",
    adminCheck,
    requireAdmin,
    zValidator(
      "json",
      z.object({
        qrCodeId: z
          .string()
          .min(1, "qrCodeId and locationId are required")
          .transform((value, ctx) => {
            const extractedCode = extractBookCodeFromLink(value);
            if (!extractedCode) {
              ctx.addIssue({
                code: "custom",
                message:
                  "qrCodeId must be the full Telegram mini app link including startapp=COPY-...",
              });
              return z.NEVER;
            }
            return extractedCode;
          }),
        locationId: z
          .number()
          .int()
          .positive("qrCodeId and locationId are required"),
      }),
      (result, c) => {
        if (!result.success) {
          return c.json(
            {
              success: false,
              error: result.error.issues[0]?.message ?? "Invalid request body",
            },
            400,
          );
        }
      },
    ),
    async (c) => {
      const { bookId } = c.req.param();
      const body = c.req.valid("json");

      const db = drizzle(c.env.DATABASE, { schema });
      const result = await addBookCopy(
        db,
        parseInt(bookId),
        body.locationId,
        body.qrCodeId,
      );

      if (result.success) {
        return c.json({ success: true, copy: result.copy });
      }

      return c.json({ success: false, error: result.error }, 400);
    },
  );
