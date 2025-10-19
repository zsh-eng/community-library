import { CommandGroup } from "@grammyjs/commands";
import { drizzle } from "drizzle-orm/d1";
import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { Hono } from "hono";
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
// MESSAGE FORMATTING HELPERS
// ============================================================================

/**
 * Escape special characters for Telegram Markdown
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

async function sendBookDetailsMessage(
  ctx: Context,
  bookDetails: Awaited<ReturnType<typeof getBookDetails>>,
) {
  if (!bookDetails) {
    return;
  }

  const copiesText = bookDetails.copies
    .map((copy) => {
      const statusEmoji = copy.isAvailable ? "✅" : "📅";
      const statusText = copy.isAvailable
        ? "Available"
        : `Borrowed (due back ${new Date(copy.dueDate!).toLocaleDateString()})`;
      return `📖 Copy ${copy.copyNumber}: ${statusEmoji} ${statusText}`;
    })
    .join("\n");

  const plainMessage = `📚 ${bookDetails.title}
by ${bookDetails.author}

${bookDetails.description}

📊 Availability: ${bookDetails.availableCopies} of ${bookDetails.totalCopies} ${bookDetails.totalCopies === 1 ? "copy" : "copies"} available

Copies:
${copiesText}

💡 To borrow, scan the QR code on the physical book`;

  // Apply formatting after escaping
  const message = escapeMarkdown(plainMessage).replace(
    escapeMarkdown(`📚 ${bookDetails.title}`),
    `📚 *${escapeMarkdown(bookDetails.title)}*`,
  );

  if (bookDetails.imageUrl) {
    await ctx.replyWithPhoto(bookDetails.imageUrl, {
      caption: message,
      parse_mode: "MarkdownV2",
    });
  } else {
    await ctx.reply(message, { parse_mode: "MarkdownV2" });
  }
}

/**
 * Format search results message
 */
async function sendSearchResultsMessage(
  ctx: Context,
  results: Awaited<ReturnType<typeof searchBooks>>,
  query: string,
) {
  if (results.length === 0) {
    await ctx.reply(`🔍 No results found for "${query}"`);
    return;
  }

  const resultText = results
    .map((book, index) => {
      const availability =
        book.availableCopies > 0
          ? `${book.availableCopies} available`
          : "none available";

      return `${index + 1}\\. 📚 *${escapeMarkdown(book.title)}*
   by ${escapeMarkdown(book.author)}
   ${book.totalCopies} ${book.totalCopies === 1 ? "copy" : "copies"} \\(${availability}\\)
   /book${book.isbn}`;
    })
    .join("\n\n");

  await ctx.reply(
    `🔍 Found ${results.length} result${results.length === 1 ? "" : "s"} for "${escapeMarkdown(query)}":\n\n${resultText}`,
    {
      parse_mode: "MarkdownV2",
    },
  );
}

// ============================================================================
// BOT SETUP
// ============================================================================

export const botApp = new Hono<{ Bindings: Env }>().post("/", async (c) => {
  const bot = new Bot(c.env.BOT_TOKEN, { botInfo: JSON.parse(c.env.BOT_INFO) });
  const db = drizzle(c.env.DATABASE, { schema });

  // ========================================
  // COMMAND HANDLERS
  // ========================================

  /**
   * /start - Welcome message
   */
  bot.command("start", async (ctx: Context) => {
    await ctx.reply(
      escapeMarkdown(
        `📚 Welcome to the Community Library Bot!

Available commands:
/search <query> - Search for books by title or author
/book <isbn> - View details of a specific book
/borrow <qr_code> - Borrow a book (scan QR code)
/mybooks - View your currently borrowed books

Scan a QR code on any book to borrow it!`,
      ),
      { parse_mode: "MarkdownV2" },
    );
  });

  /**
   * /search <query> - Search for books
   */
  bot.command("search", async (ctx: Context) => {
    const query = ctx.match?.toString().trim();

    if (!query) {
      await ctx.reply("Usage: /search <query>\n\nExample: /search piketty");
      return;
    }

    try {
      const results = await searchBooks(db, query, 10);
      await sendSearchResultsMessage(ctx, results, query);
    } catch (error) {
      console.error("Error searching books:", error);
      await ctx.reply(
        "❌ An error occurred while searching. Please try again.",
      );
    }
  });

  /**
   * /book <isbn> - View book details
   */
  // Create a command group for book-related commands
  const bookCommands = new CommandGroup();
  // Use regex to handle both /book <isbn> and /book<isbn> formats
  bookCommands.command(
    /book\s*(.+)/,
    "View book details",
    async (ctx: Context) => {
      // Extract ISBN from the message text directly
      const match = ctx.msg?.text?.match(/\/book\s*(.+)/);
      const isbn = match && match[1] ? match[1].trim() : "";

      if (!isbn) {
        await ctx.reply(
          "Usage: /book <isbn> or /book<isbn>\n\nExample: /book 9780674430006",
        );
        return;
      }

      try {
        const bookDetails = await getBookDetails(db, isbn);

        if (!bookDetails) {
          await ctx.reply("❌ Book not found.");
          return;
        }

        await sendBookDetailsMessage(ctx, bookDetails);
      } catch (error) {
        console.error("Error fetching book details:", error);
        await ctx.reply(
          "❌ An error occurred while fetching book details. Please try again.",
        );
      }
    },
  );

  // Register the command group with the bot
  bot.use(bookCommands);

  /**
   * /borrow <qr_code_id> - View book copy details (borrowing flow to be implemented)
   */
  bot.command("borrow", async (ctx: Context) => {
    const qrCodeId = ctx.match?.toString().trim();

    if (!qrCodeId) {
      await ctx.reply(
        "Usage: /borrow <qr_code_id>\n\nScan the QR code on the physical book to get the ID.",
      );
      return;
    }

    try {
      const copyDetails = await getBookCopyDetails(db, qrCodeId);

      if (!copyDetails) {
        await ctx.reply("❌ Book copy not found. Please check the QR code.");
        return;
      }

      // Determine availability state
      const isAvailable = !copyDetails.currentLoan;
      const isBorrowedByCurrentUser =
        copyDetails.currentLoan?.telegramUserId === ctx.from?.id;

      // Format message
      const message = `📚 *${escapeMarkdown(copyDetails.book.title)}*
by ${escapeMarkdown(copyDetails.book.author)}

Copy #${copyDetails.copyNumber}

${escapeMarkdown(copyDetails.book.description)}

Status: ${isAvailable ? "✅ Available" : isBorrowedByCurrentUser ? "📖 Borrowed by you" : "📅 Currently borrowed"}`;

      // Add inline keyboard (borrowing flow buttons to be implemented in Phase 2)
      const keyboard = new InlineKeyboard();

      if (isAvailable) {
        keyboard.text("📚 Borrow this book", `borrow:${qrCodeId}`);
      } else if (isBorrowedByCurrentUser) {
        keyboard.text("✅ Return this book", `return:${qrCodeId}`);
      } else {
        // Book borrowed by someone else - no action available
        const dueDate = new Date(
          copyDetails.currentLoan!.dueDate,
        ).toLocaleDateString();
        await ctx.reply(
          escapeMarkdown(
            `${message}\n\n📅 This book is currently borrowed and due back on ${dueDate}\\.`,
          ),
          { parse_mode: "MarkdownV2" },
        );
        return;
      }

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
      await ctx.reply("❌ An error occurred. Please try again.");
    }
  });

  /**
   * /mybooks - View currently borrowed books
   */
  bot.command("mybooks", async (ctx: Context) => {
    if (!ctx.from) {
      await ctx.reply("❌ Unable to identify user.");
      return;
    }

    try {
      const activeLoans = await getUserActiveLoans(db, ctx.from.id);

      if (activeLoans.length === 0) {
        await ctx.reply("📚 You don't have any borrowed books currently.");
        return;
      }

      const loanText = activeLoans
        .map((loan, index) => {
          const dueDate = new Date(loan.dueDate).toLocaleDateString();
          const isOverdue = new Date(loan.dueDate) < new Date();
          const overdueIndicator = isOverdue ? " ⚠️ OVERDUE" : "";

          return `${index + 1}\\. *${escapeMarkdown(loan.title)}*
   by ${escapeMarkdown(loan.author)}
   Copy #${loan.copyNumber}
   Due: ${dueDate}${overdueIndicator}`;
        })
        .join("\n\n");

      await ctx.reply(
        `📚 Your borrowed books \\(${activeLoans.length}\\):\n\n${loanText}\n\n💡 Scan the QR code to return a book`,
        { parse_mode: "MarkdownV2" },
      );
    } catch (error) {
      console.error("Error fetching user loans:", error);
      await ctx.reply("❌ An error occurred. Please try again.");
    }
  });

  // ========================================
  // CALLBACK QUERY HANDLERS (for inline buttons)
  // ========================================

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [action, qrCodeId] = data.split(":");

    if (!ctx.from) {
      await ctx.answerCallbackQuery({ text: "❌ Unable to identify user." });
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
          const dueDate = new Date(result.loan.dueDate).toLocaleDateString();
          await ctx.answerCallbackQuery({
            text: "✅ Book borrowed successfully!",
          });
          await ctx.editMessageCaption({
            caption: `✅ *Book Borrowed Successfully\\!*

📚 ${escapeMarkdown(result.book.title)}
Copy #${result.copyNumber}

📅 Due date: ${dueDate}

Enjoy your reading\\! Remember to return it on time\\.`,
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
          await ctx.answerCallbackQuery({
            text: "✅ Book returned successfully!",
          });
          await ctx.editMessageCaption({
            caption: `✅ *Book Returned Successfully\\!*

📚 ${escapeMarkdown(result.book.title)}

Thank you for returning the book\\!`,
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
        text: "❌ An error occurred. Please try again.",
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
      await sendSearchResultsMessage(ctx, results, query);
    } catch (error) {
      console.error("Error searching books:", error);
      await ctx.reply(
        "❌ An error occurred while searching. Please try again.",
      );
    }
  });
  return webhookCallback(bot, "cloudflare-mod")(c.req.raw);
});
