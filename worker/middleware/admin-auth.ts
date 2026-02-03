import { createMiddleware } from "hono/factory";
import { isUserAdmin } from "../lib/admin";

// Extend Hono context with isAdmin flag
declare module "hono" {
  interface ContextVariableMap {
    isAdmin: boolean;
  }
}

/**
 * Middleware that checks if the current user is an admin and sets c.get("isAdmin").
 * Must be used after telegramAuth middleware (requires initData to be set).
 */
export const adminCheck = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const initData = c.get("initData");
    const userId = initData?.user?.id;

    if (!userId) {
      c.set("isAdmin", false);
      return next();
    }

    const isAdmin = await isUserAdmin(
      c.env.BOT_TOKEN,
      c.env.ADMIN_GROUP_ID,
      userId,
    );
    c.set("isAdmin", isAdmin);

    await next();
  },
);

/**
 * Middleware that requires the user to be an admin.
 * Returns 403 if not admin. Must be used after adminCheck middleware.
 */
export const requireAdmin = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const isAdmin = c.get("isAdmin");

    if (!isAdmin) {
      return c.json({ error: "Forbidden: Admin access required" }, 403);
    }

    await next();
  },
);
