import { CommandGroup } from "@grammyjs/commands";
import { drizzle } from "drizzle-orm/d1";
import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { Hono } from "hono";
import {
  BOOK_COPY_NOT_FOUND,
  BOOK_DETAILS_ERROR,
  BOOK_NOT_FOUND,
  BOOK_USAGE,
  BORROW_SUCCESS,
  formatBookCopyBorrowedMessage,
  formatBookCopyDetailsMessage,
  formatBookDetailsMessage,
  formatBorrowSuccessMessage,
  formatMyBooksMessage,
  formatNoSearchResultsMessage,
  formatReturnSuccessMessage,
  formatSearchResultsMessage,
  GENERIC_ERROR,
  NO_BORROWED_BOOKS,
  RETURN_SUCCESS,
  SEARCH_ERROR,
  USER_IDENTIFICATION_ERROR,
  WELCOME_MESSAGE,
} from "./bot/format-message";
import * as schema from "./db/schema";
import {
  borrowBook,
  getBookCopyDetails,
  getBookDetails,
  getUserActiveLoans,
  returnBook,
  searchBooks,
} from "./lib/book";

// ============================================================================
// BOT SETUP
// ============================================================================

export const botApp = new Hono<{ Bindings: Env }>().post("/", async (c) => {
  const bot = new Bot(c.env.BOT_TOKEN, { botInfo: JSON.parse(c.env.BOT_INFO) });
  const db = drizzle(c.env.DATABASE, { schema });

  // Set bot commands with descriptions
  await bot.api.setMyCommands([
    { command: "start", description: "Start the bot and view welcome message" },
    { command: "mybooks", description: "View your currently borrowed books" },
  ]);

  // ========================================
  // COMMAND HANDLERS
  // ========================================

  /**
   * /start - Welcome message
   *
   * If the user sends a QR code, the message is a deeplink of the form
   * https://t.me/your_bot_name?start=borrow_BOOK_ID
   *
   * This allows us to keep the borrowing of books slightly opaque
   * (there's no specific bot command, the user needs to scan the QR code)
   */
  bot.command("start", async (ctx: Context) => {
    await ctx.reply(WELCOME_MESSAGE, {
      parse_mode: "MarkdownV2",
    });

    const hiddenQuery = ctx.match?.toString().trim();
    if (!hiddenQuery) {
      return;
    }

    const [command, qrCodeId] = hiddenQuery.split("_");
    if (command !== "borrow") {
      return;
    }

    if (!qrCodeId) {
      return;
    }

    try {
      const copyDetails = await getBookCopyDetails(db, qrCodeId);

      if (!copyDetails) {
        await ctx.reply(BOOK_COPY_NOT_FOUND);
        return;
      }

      // Determine availability state
      const isAvailable = !copyDetails.currentLoan;
      const isBorrowedByCurrentUser =
        copyDetails.currentLoan?.telegramUserId === ctx.from?.id;

      // Add inline keyboard (borrowing flow buttons to be implemented in Phase 2)
      const keyboard = new InlineKeyboard();

      if (isAvailable) {
        keyboard.text("📚 Borrow this book", `borrow:${qrCodeId}`);
      } else if (isBorrowedByCurrentUser) {
        keyboard.text("✅ Return this book", `return:${qrCodeId}`);
      } else {
        // Book borrowed by someone else - no action available
        const message = formatBookCopyBorrowedMessage(copyDetails);
        await ctx.reply(message, { parse_mode: "MarkdownV2" });
        return;
      }

      const message = formatBookCopyDetailsMessage(copyDetails);

      if (copyDetails.book.imageUrl) {
        await ctx.replyWithPhoto(copyDetails.book.imageUrl, {
          caption: message,
          parse_mode: "MarkdownV2",
          reply_markup: keyboard,
        });
      } else {
        await ctx.reply(message, {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard,
        });
      }
    } catch (error) {
      console.error("Error fetching book copy details:", error);
      await ctx.reply(GENERIC_ERROR);
    }
  });

  /**
   * /book <isbn> - View book details
   */
  // Create a command group for book-related commands
  const bookCommands = new CommandGroup();
  // Use regex to handle both /book <isbn> and /book<isbn> formats
  bookCommands.command(
    /^book\s*(.+)/,
    "View book details",
    async (ctx: Context) => {
      // Extract ISBN from the message text directly
      const match = ctx.msg?.text?.match(/\/book\s*(.+)/);
      const isbn = match && match[1] ? match[1].trim() : "";

      if (!isbn) {
        await ctx.reply(BOOK_USAGE);
        return;
      }

      try {
        const bookDetails = await getBookDetails(db, isbn);

        if (!bookDetails) {
          await ctx.reply(BOOK_NOT_FOUND);
          return;
        }

        const message = formatBookDetailsMessage(bookDetails);

        if (bookDetails.imageUrl) {
          await ctx.replyWithPhoto(bookDetails.imageUrl, {
            caption: message,
            parse_mode: "MarkdownV2",
          });
        } else {
          await ctx.reply(message, { parse_mode: "MarkdownV2" });
        }
      } catch (error) {
        console.error("Error fetching book details:", error);
        await ctx.reply(BOOK_DETAILS_ERROR);
      }
    },
  );

  // Register the command group with the bot
  bot.use(bookCommands);

  /**
   * /mybooks - View currently borrowed books
   */
  bot.command("mybooks", async (ctx: Context) => {
    if (!ctx.from) {
      await ctx.reply(USER_IDENTIFICATION_ERROR);
      return;
    }

    try {
      const activeLoans = await getUserActiveLoans(db, ctx.from.id);

      if (activeLoans.length === 0) {
        await ctx.reply(NO_BORROWED_BOOKS);
        return;
      }

      const message = formatMyBooksMessage(activeLoans);
      await ctx.reply(message, { parse_mode: "MarkdownV2" });
    } catch (error) {
      console.error("Error fetching user loans:", error);
      await ctx.reply(GENERIC_ERROR);
    }
  });

  // ========================================
  // CALLBACK QUERY HANDLERS (for inline buttons)
  // ========================================

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [action, qrCodeId] = data.split(":");

    if (!ctx.from) {
      await ctx.answerCallbackQuery({ text: USER_IDENTIFICATION_ERROR });
      return;
    }

    try {
      if (action === "borrow") {
        // Handle borrow action
        const result = await borrowBook(
          db,
          qrCodeId,
          ctx.from.id,
          ctx.from.username,
        );

        if (result.success && result.loan && result.book) {
          await ctx.answerCallbackQuery({ text: BORROW_SUCCESS });
          const message = formatBorrowSuccessMessage(result);
          await ctx.editMessageCaption({
            caption: message,
            parse_mode: "MarkdownV2",
          });
        } else {
          await ctx.answerCallbackQuery({
            text: `❌ ${result.error || "Unknown error"}`,
            show_alert: true,
          });
        }
      } else if (action === "return") {
        // Handle return action
        const result = await returnBook(db, qrCodeId, ctx.from.id);

        if (result.success && result.book) {
          await ctx.answerCallbackQuery({ text: RETURN_SUCCESS });
          const message = formatReturnSuccessMessage(result);
          await ctx.editMessageCaption({
            caption: message,
            parse_mode: "MarkdownV2",
          });
        } else {
          await ctx.answerCallbackQuery({
            text: `❌ ${result.error || "Unknown error"}`,
            show_alert: true,
          });
        }
      }
    } catch (error) {
      console.error("Error handling callback query:", error);
      await ctx.answerCallbackQuery({
        text: GENERIC_ERROR,
        show_alert: true,
      });
    }
  });

  bot.on("message", async (ctx) => {
    const query = ctx.message?.text?.trim();
    if (!query || query.startsWith("/") || query.length < 3) {
      return;
    }

    try {
      const results = await searchBooks(db, query, 10);

      if (results.length === 0) {
        await ctx.reply(formatNoSearchResultsMessage(query));
        return;
      }

      const message = formatSearchResultsMessage(results, query);
      await ctx.reply(message, { parse_mode: "MarkdownV2" });
    } catch (error) {
      console.error("Error searching books:", error);
      await ctx.reply(SEARCH_ERROR);
    }
  });
  return webhookCallback(bot, "cloudflare-mod")(c.req.raw);
});
