import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as schema from "../db/schema";
import { getUserActiveLoans } from "../lib/book";
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

    return c.json({ loans });
  });
