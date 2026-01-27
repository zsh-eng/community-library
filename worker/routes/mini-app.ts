import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as schema from "../db/schema";
import { borrowBook, getUserActiveLoans } from "../lib/book";
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
  .get("/loans", async (c) => {
    const initData = c.get("initData");
    const telegramUserId = initData.user?.id;

    if (!telegramUserId) {
      return c.json({ error: "User ID not found in init data" }, 400);
    }

    const db = drizzle(c.env.DATABASE, { schema });
    const loans = await getUserActiveLoans(db, telegramUserId);
    console.log("found the active loans!");

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
  });
