/// <reference types="../worker-configuration.d.ts" />
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema.ts";

const app = new Hono<{
  Bindings: Env;
}>();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const route = app
  .get("/api", (c) => {
    return c.json({
      name: "Cloudflare",
    });
  })
  .get("/api/users", async (c) => {
    const db = drizzle(c.env.DATABASE, {
      schema,
    });
    const users = await db.select().from(schema.users);
    return c.json({
      users,
    });
  });

export default app;
export type AppType = typeof route;
