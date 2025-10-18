## Instructions

We're using Hono with React and Cloudflare Pages.

The backend is located in `workers/index.ts`.
For types to show up on the frontend client, the methods should be chained on the app.
For the Telegram bot, we don't need to change and can configure the router separately (with a different subpath and CORS rules to
enable Telegram to communicate with the bot).

We're using Shadcn UI and TailwindCSS for the frontend UI.
We're using React Query for handling the data fetching states for making the RPC calls to the backend.

Our bot is being hosted on a Cloudflare Workers Paid plan $5/month.

## Core Architecture

**Cloudflare Stack:**
- **Workers**: Telegram bot webhook handler
- **D1**: SQLite database for books and loans
- **Pages**: Static site for browsing books, generating QR codes
- **Cron Triggers**: For reminder notifications (Telegram bots don't have native scheduled messages, but Workers do)

## Data Schema

```sql
-- Books table (metadata about the book itself)
CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  image_url TEXT,  -- URL to book cover (primarily from Open Library)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Book copies (physical instances)
CREATE TABLE book_copies (
  qr_code_id TEXT PRIMARY KEY,  -- e.g., "BK-7X2M9K" - generated, no integer ID needed
  book_id INTEGER NOT NULL,
  copy_number INTEGER NOT NULL, -- e.g., "Copy 1 of 3"
  status TEXT DEFAULT 'available', -- available, borrowed, lost, damaged
  FOREIGN KEY (book_id) REFERENCES books(id),
  UNIQUE(book_id, copy_number)
);

-- Loans table
CREATE TABLE loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code_id TEXT NOT NULL,  -- Direct reference to book copy
  telegram_user_id INTEGER NOT NULL,
  telegram_username TEXT,
  borrowed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME NOT NULL,
  returned_at DATETIME,
  last_reminder_sent DATETIME,
  FOREIGN KEY (qr_code_id) REFERENCES book_copies(qr_code_id)
);

-- Index for active loans
CREATE INDEX idx_active_loans ON loans(qr_code_id, returned_at)
WHERE returned_at IS NULL;
```

## Key Design Decisions

### 1. **Book Cover Images**
We use **Open Library Covers API** for book cover images:
- When a book is added with an ISBN, store: `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`
- The `-L` suffix provides large images (you can use `-M` for medium or `-S` for small)
- If the ISBN doesn't exist in Open Library, the `image_url` field can be NULL or point to a placeholder
- Admin can manually override with any valid image URL if needed

**Note on ISBN matching:**
- Store the ISBN of your physical book, even if it's a different edition than what's in Open Library
- The `image_url` field stores the actual resolved URL that works (which may use a different ISBN for the image)
- This allows flexibility when your edition's cover isn't available

### 2. **QR Code ID Generation**
Each physical book copy gets a unique QR code ID with format: `BK-XXXXXX`

**Generation strategy:**
```typescript
function generateQrCodeId(): string {
  // Use alphanumeric chars excluding ambiguous ones (0/O, 1/I, 5/S)
  const chars = '23467689ABCDEFGHJKLMNPQRTUVWXY';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${code}`;  // e.g., "BK-7X2M9K"
}

// With collision checking when creating a new book copy
async function generateUniqueQrCodeId(db: D1Database): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const id = generateQrCodeId();
    const existing = await db.prepare(
      'SELECT qr_code_id FROM book_copies WHERE qr_code_id = ?'
    ).bind(id).first();

    if (!existing) return id;
    attempts++;
  }
  throw new Error('Failed to generate unique QR code ID after 10 attempts');
}
```

**Why this format:**
- `BK-` prefix identifies it as a book (vs. other QR codes in the space)
- 6 characters = 29^6 = ~594 million possible codes (no collision risk for a community library)
- Human-readable and typeable if QR code fails
- No sequential pattern (harder to forge/guess)

**QR Code Deep Link:**
The QR code encodes a Telegram deep link:
```
https://t.me/your_bot?start=borrow_BK-7X2M9K
```

When scanned, Telegram automatically opens the bot and sends `/start borrow_BK-7X2M9K`, which your bot parses to initiate the borrow flow.

### 3. **Return Process**
Go **honor-based** for MVP:
- Send reminder 2 days before due date
- Send reminder on due date
- User replies `/return BK-7X2M9K` to confirm return
- *Optional future*: Add photo verification or admin approval for disputed returns

**Why honor-based?**
- Simpler to implement
- Community library = trust-based system already
- Can add verification later if abuse happens
- Photo verification adds friction and storage costs

### 4. **Telegram Bot Commands**

```
/start borrow_BK-7X2M9K - Borrow book with QR code ID
/return BK-7X2M9K - Return a book
/mybooks - List your current loans
/search <query> - Search books by title/author
/help - Show available commands
```

### 5. **Scheduled Reminders**

Telegram bots **cannot** send scheduled messages natively. You need:

**Cloudflare Cron Trigger** (runs daily):
```javascript
// In wrangler.toml
[triggers]
crons = ["0 9 * * *"]  // Run at 9 AM daily

// In your worker
export default {
  async scheduled(event, env, ctx) {
    // Query D1 for loans due in 2 days or overdue
    // Send Telegram messages via Bot API
  }
}
```

### 6. **Search Implementation**

For SQLite full-text search:
```sql
-- Create FTS5 virtual table
CREATE VIRTUAL TABLE books_fts USING fts5(
  title, author, content=books, content_rowid=id
);

-- Search query
SELECT b.* FROM books b
JOIN books_fts fts ON b.id = fts.rowid
WHERE books_fts MATCH 'query here'
ORDER BY rank;
```

Or simpler (good enough for small library):
```sql
SELECT * FROM books
WHERE title LIKE '%query%' OR author LIKE '%query%'
ORDER BY title;
```

## Suggested Feature Priorities

**MVP (Week 1-2):**
1. ✅ Database schema + seed data
2. ✅ Telegram bot: borrow, return, mybooks
3. ✅ QR code generation page on Cloudflare Pages
4. ✅ Basic search

**Phase 2 (Week 3-4):**
5. ✅ Cron job for reminders
6. ✅ Web view: browse all books, availability status
7. ✅ Admin commands (add/remove books)

**Future Enhancements:**
- Waitlist for popular books
- Photo verification for returns
- Borrowing history/stats
- Fine system for overdue books
- Integration with NUS login

## Potential Issues to Consider

1. **Loan Duration**: Set a default (2 weeks?) in your bot logic
2. **Concurrent Borrows**: Add check that user doesn't have >3 active loans
3. **Lost QR Codes**: Admin function to regenerate or deactivate
4. **Rate Limiting**: Cloudflare Workers have generous free tier, but watch for abuse
5. **User Identity**: Telegram user IDs are stable, but users can change usernames

## Cloudflare Workers + D1 Gotchas

- D1 is eventually consistent (usually milliseconds, but be aware)
- Free tier: 100k reads/day, 100k writes/day (plenty for college library)
- Workers have 10ms CPU time limit (shouldn't be an issue)
- Use Wrangler CLI for local development with `--local` flag

Want me to elaborate on any specific part, or shall we start with the database schema + Telegram bot setup?

## Why Grammy is Worth It

**Pros:**
- **Middleware pattern**: Clean separation of concerns (auth, logging, error handling)
- **Conversation management**: Grammy has built-in conversation helpers if you want multi-step flows (e.g., "Which copy do you want?" dialogs)
- **Type safety**: Excellent TypeScript support with proper types for Telegram API
- **Built-in helpers**: Command parsing, inline keyboards, callback queries all have nice abstractions
- **Active maintenance**: Well-documented, actively maintained

**Cons:**
- Adds ~50KB to your Worker bundle (but still well under Cloudflare's 1MB limit)
- One more dependency to learn

**Use Grammy**. For your use case:

```typescript
import { Bot, Context } from 'grammy';

const bot = new Bot(env.BOT_TOKEN);

// Clean command handlers
bot.command('start', async (ctx) => {
  const args = ctx.match; // "borrow_ABC123"
  if (args.startsWith('borrow_')) {
    await handleBorrow(ctx, args.slice(7));
  }
});

bot.command('mybooks', async (ctx) => {
  const loans = await getActiveLoans(ctx.from.id);
  // ...
});

// Inline keyboard example
bot.command('return', async (ctx) => {
  const loans = await getActiveLoans(ctx.from.id);
  await ctx.reply('Which book?', {
    reply_markup: {
      inline_keyboard: loans.map(loan => [{
        text: loan.title,
        callback_data: `return_${loan.qr_code_id}`
      }])
    }
  });
});

// Handle button clicks
bot.callbackQuery(/^return_/, async (ctx) => {
  const qrCodeId = ctx.callbackQuery.data.slice(7);
  await processReturn(qrCodeId);
  await ctx.answerCallbackQuery('Book returned!');
});
```

Compare to raw API for the same inline keyboard flow - you'd need to manually:
- Parse webhook payload structure
- Handle different update types (message vs callback_query)
- Call `answerCallbackQuery` properly (Grammy does this automatically)
- Manage error states

## Cloudflare Workers Integration

Grammy works great with Workers:

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const bot = new Bot(env.BOT_TOKEN);

    // Register handlers...

    // Use webhookCallback for Cloudflare Workers
    return bot.webhookCallback(request);
  }
};
```
