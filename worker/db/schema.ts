import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const books = sqliteTable("books", {
  id: integer().primaryKey({ autoIncrement: true }),
  isbn: text().unique(),
  title: text().notNull(),
  description: text().notNull(),
  author: text().notNull(),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const bookCopies = sqliteTable("book_copies", {
  qrCodeId: text("qr_code_id").primaryKey(),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id),
  copyNumber: integer("copy_number").notNull(),
  status: text().default("available"),
});

export const loans = sqliteTable(
  "loans",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    qrCodeId: text("qr_code_id")
      .notNull()
      .references(() => bookCopies.qrCodeId),
    telegramUserId: integer("telegram_user_id").notNull(),
    telegramUsername: text("telegram_username"),
    borrowedAt: integer("borrowed_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
    returnedAt: integer("returned_at", { mode: "timestamp" }),
    lastReminderSent: integer("last_reminder_sent", { mode: "timestamp" }),
  },
  (table) => [index("idx_active_loans").on(table.qrCodeId, table.returnedAt)],
);

export const booksRelations = relations(books, ({ many }) => ({
  bookCopies: many(bookCopies),
}));

export const bookCopiesRelations = relations(bookCopies, ({ one, many }) => ({
  book: one(books, {
    fields: [bookCopies.bookId],
    references: [books.id],
  }),
  loans: many(loans),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  bookCopy: one(bookCopies, {
    fields: [loans.qrCodeId],
    references: [bookCopies.qrCodeId],
  }),
}));
