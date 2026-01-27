import { parse, validate, type InitData } from "@tma.js/init-data-node";
import { createMiddleware } from "hono/factory";

// Extend Hono context with initData
declare module "hono" {
  interface ContextVariableMap {
    initData: InitData;
  }
}

/**
 * Telegram Mini App authentication middleware.
 * Validates initData from the Authorization header.
 *
 * Expected header format: "Authorization: tma <initDataRaw>"
 */
export const telegramAuth = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization") || "";
    const [authType, authData] = authHeader.split(" ");

    if (authType !== "tma" || !authData) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      // Validate init data signature (1 hour expiry)
      validate(authData, c.env.BOT_TOKEN, { expiresIn: 3600 });
      const initData = parse(authData);
      c.set("initData", initData);
      await next();
    } catch {
      return c.json({ error: "Invalid init data" }, 401);
    }
  },
);
