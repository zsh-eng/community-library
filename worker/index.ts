import { Hono } from "hono";

const app = new Hono();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const route = app.get("/api", (c) => {
  return c.json({
    name: "Cloudflare",
  });
});

export default app;
export type AppType = typeof route;
