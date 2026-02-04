import { CommandGroup } from "@grammyjs/commands";
import { drizzle } from "drizzle-orm/d1";
import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { Hono } from "hono";
import {
  BOOK_DETAILS_ERROR,
  BOOK_NOT_FOUND,
  BOOK_USAGE,
  formatBookDetailsMessage,
  formatMyBooksMessage,
  formatNoSearchResultsMessage,
  formatSearchResultsMessage,
  GENERIC_ERROR,
  NO_BORROWED_BOOKS,
  SEARCH_ERROR,
  USER_IDENTIFICATION_ERROR,
  WELCOME_MESSAGE,
} from "./bot/format-message";
import * as schema from "./db/schema";
import { isUserAdmin } from "./lib/admin";
import { getBookDetails, getUserActiveLoans, searchBooks } from "./lib/book";

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
   */
  bot.command("start", async (ctx: Context) => {
    await ctx.reply(WELCOME_MESSAGE, {
      parse_mode: "MarkdownV2",
    });
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

        // Check if user is admin to show manage button
        let keyboard: InlineKeyboard | undefined;
        if (ctx.from && c.env.MINIAPP_URL) {
          const userIsAdmin = await isUserAdmin(
            c.env.BOT_TOKEN,
            c.env.ADMIN_GROUP_ID,
            ctx.from.id,
          );
          if (userIsAdmin) {
            const url = `${c.env.MINIAPP_URL}?startapp=admin_${bookDetails.id}`;
            console.log("The URL ", url);
            keyboard = new InlineKeyboard().url("Manage Book", url);
          }
        }

        if (bookDetails.imageUrl) {
          await ctx.replyWithPhoto(bookDetails.imageUrl, {
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

  bot.on("message", async (ctx) => {
    const query = ctx.message?.text?.trim();
    if (!query || query.startsWith("/") || query.length < 2) {
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
