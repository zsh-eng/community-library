/// <reference types="../worker-configuration.d.ts" />
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, isNull } from "drizzle-orm";
import * as schema from "./db/schema.ts";
import { botApp } from "./bot.ts";

const app = new Hono<{
  Bindings: Env;
}>();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const route = app
  .basePath("/api")
  .get("/books", async (c) => {
    const db = drizzle(c.env.DATABASE, {
      schema,
    });

    const books = await db.query.books.findMany({
      columns: {
        id: true,
        isbn: true,
        title: true,
        author: true,
        imageUrl: true,
        createdAt: true,
        description: false,
      },
    });

    return c.json({ books });
  })
  .get("/books/:id", async (c) => {
    const db = drizzle(c.env.DATABASE, {
      schema,
    });

    const bookId = parseInt(c.req.param("id"));

    const book = await db.query.books.findFirst({
      where: eq(schema.books.id, bookId),
      with: {
        bookCopies: {
          with: {
            loans: {
              where: isNull(schema.loans.returnedAt),
            },
          },
        },
      },
    });

    if (!book) {
      return c.json({ error: "Book not found" }, 404);
    }

    return c.json({ book });
  })
  .route("/bot", botApp);

export default app;
// For type inference in the client
export type AppType = typeof route;
