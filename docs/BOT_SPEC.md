# Telegram Bot Specification for Community Library

## Overview
A Telegram bot that allows users to borrow and return books by scanning QR codes, search the library catalog, and manage their loans—all without authentication (we simply store Telegram user ID and username).

---

## Bot Commands

### Core Commands

1. **`/start`** or **`/start borrow_{QR_CODE_ID}`**
   - Entry point, shows welcome message and `/help`
   - If deep link parameter present (from QR code scan), initiate borrow flow

2. **`/book {qr_code_id}`**
   - Query specific book copy by QR code ID
   - Returns: title, author, description, cover image (via link preview), copy status
   - Shows inline keyboard with action buttons (see Button Logic below)

3. **`/mybooks`**
   - List user's active loans
   - For each: title, QR code, borrowed date, due date
   - Inline keyboard with "Return" button for each book

4. **`/help`**
   - List all available commands with descriptions

5. **Plain text messages (no command)**
   - Treated as search query
   - Returns list of matching books with basic info
   - Each result shows `/book {qr_code_id}` command to get details

---

## Button Logic (Inline Keyboards)

**Important:** Inline keyboard buttons do NOT trigger slash commands. They trigger **callback queries** that your bot handles separately. When a user clicks "Borrow This Book", Telegram sends a callback query with the callback_data (e.g., `borrow_BK-7X2M9K`) to your bot, and you handle it in a callback query handler.

When a user queries a book via `/book {qr_code_id}`, show inline keyboard based on state:

### State 1: Book Available
```
[ 📖 Borrow This Book ]
```
Callback data: `borrow_{qr_code_id}`

### State 2: Book Borrowed by Current User
```
[ ✅ Return This Book ]
```
Callback data: `return_{qr_code_id}`

### State 3: Book Borrowed by Someone Else
```
[ ⏳ Currently Unavailable ]
```
Callback data: `unavailable_{qr_code_id}` (disabled button or just shows info message when clicked)

---

## Backend Functions

All functions use Drizzle ORM with the relational query API.

### Required Imports

```typescript
import { eq, and, isNull, like, or, sql, desc } from 'drizzle-orm';
import { books, bookCopies, loans } from './db/schema';
```

### 1. **`getBookCopyDetails(qrCodeId: string)`**

Returns book copy with joined book details and current loan status.

```typescript
async function getBookCopyDetails(db: DrizzleD1Database, qrCodeId: string) {
  const bookCopy = await db.query.bookCopies.findFirst({
    where: eq(bookCopies.qrCodeId, qrCodeId),
    with: {
      book: true,
      loans: {
        where: isNull(loans.returnedAt),
        limit: 1,
      },
    },
  });

  if (!bookCopy) {
    return null;
  }

  return {
    qrCodeId: bookCopy.qrCodeId,
    copyNumber: bookCopy.copyNumber,
    status: bookCopy.status,
    book: bookCopy.book,
    currentLoan: bookCopy.loans[0] || null,
  };
}
```

**Returns:**
```typescript
{
  qrCodeId: string;
  copyNumber: number;
  status: string;
  book: {
    id: number;
    title: string;
    author: string;
    description: string;
    imageUrl: string | null;
    isbn: string | null;
  };
  currentLoan: {
    id: number;
    telegramUserId: number;
    telegramUsername: string;
    borrowedAt: Date;
    dueDate: Date;
  } | null;
}
```

### 2. **`borrowBook(qrCodeId: string, telegramUserId: number, telegramUsername: string)`**

Creates a new loan with transaction to prevent race conditions.

```typescript
async function borrowBook(
  db: DrizzleD1Database,
  qrCodeId: string,
  telegramUserId: number,
  telegramUsername: string
) {
  try {
    await db.transaction(async (tx) => {
      // Check if copy exists and has no active loan
      const bookCopy = await tx.query.bookCopies.findFirst({
        where: eq(bookCopies.qrCodeId, qrCodeId),
        with: {
          loans: {
            where: isNull(loans.returnedAt),
          },
        },
      });

      if (!bookCopy) {
        throw new Error('BOOK_NOT_FOUND');
      }

      if (bookCopy.loans.length > 0) {
        throw new Error('ALREADY_BORROWED');
      }

      // Create new loan (14 days)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      await tx.insert(loans).values({
        qrCodeId,
        telegramUserId,
        telegramUsername,
        dueDate,
      });
    });

    return { success: true };
  } catch (error) {
    if (error.message === 'BOOK_NOT_FOUND') {
      return { success: false, error: 'Book copy not found' };
    }
    if (error.message === 'ALREADY_BORROWED') {
      return { success: false, error: 'Book already borrowed' };
    }
    throw error;
  }
}
```

**Error cases:**
- Book copy doesn't exist → `BOOK_NOT_FOUND`
- Book already borrowed → `ALREADY_BORROWED`
- Race condition → Transaction will prevent double-borrow

### 3. **`returnBook(qrCodeId: string, telegramUserId: number)`**

Marks a loan as returned.

```typescript
async function returnBook(
  db: DrizzleD1Database,
  qrCodeId: string,
  telegramUserId: number
) {
  try {
    const result = await db
      .update(loans)
      .set({ returnedAt: new Date() })
      .where(
        and(
          eq(loans.qrCodeId, qrCodeId),
          eq(loans.telegramUserId, telegramUserId),
          isNull(loans.returnedAt)
        )
      )
      .returning();

    if (result.length === 0) {
      return { success: false, error: 'No active loan found for this user' };
    }

    return { success: true };
  } catch (error) {
    throw error;
  }
}
```

**Error cases:**
- No active loan for this user → `No active loan found`
- Book copy doesn't exist → Constraint error

### 4. **`searchBooks(query: string, limit: number = 10)`**

Searches books by title or author using LIKE (simple approach for MVP).

```typescript
async function searchBooks(db: DrizzleD1Database, query: string, limit = 10) {
  const searchPattern = `%${query}%`;
  
  const results = await db.query.books.findMany({
    where: or(
      like(books.title, searchPattern),
      like(books.author, searchPattern)
    ),
    with: {
      bookCopies: {
        with: {
          loans: {
            where: isNull(loans.returnedAt),
          },
        },
      },
    },
    limit,
  });

  // Calculate availability for each book
  return results.map((book) => {
    const totalCopies = book.bookCopies.length;
    const borrowedCopies = book.bookCopies.filter(
      (copy) => copy.loans.length > 0
    ).length;
    const availableCopies = totalCopies - borrowedCopies;

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      imageUrl: book.imageUrl,
      totalCopies,
      availableCopies,
      // Include first available copy QR code for easy access
      firstAvailableCopy: book.bookCopies.find(
        (copy) => copy.loans.length === 0
      )?.qrCodeId,
    };
  });
}
```

**Returns array of:**
```typescript
{
  id: number;
  title: string;
  author: string;
  description: string;
  imageUrl: string | null;
  totalCopies: number;
  availableCopies: number;
  firstAvailableCopy: string | undefined;
}
```

### 5. **`getUserActiveLoans(telegramUserId: number)`**

Gets all active loans for a user.

```typescript
async function getUserActiveLoans(db: DrizzleD1Database, telegramUserId: number) {
  const activeLoans = await db.query.loans.findMany({
    where: and(
      eq(loans.telegramUserId, telegramUserId),
      isNull(loans.returnedAt)
    ),
    with: {
      bookCopy: {
        with: {
          book: true,
        },
      },
    },
    orderBy: [loans.dueDate],
  });

  return activeLoans.map((loan) => ({
    qrCodeId: loan.qrCodeId,
    borrowedAt: loan.borrowedAt,
    dueDate: loan.dueDate,
    title: loan.bookCopy.book.title,
    author: loan.bookCopy.book.author,
    copyNumber: loan.bookCopy.copyNumber,
    isOverdue: loan.dueDate < new Date(),
  }));
}
```

**Returns array of:**
```typescript
{
  qrCodeId: string;
  borrowedAt: Date;
  dueDate: Date;
  title: string;
  author: string;
  copyNumber: number;
  isOverdue: boolean;
}
```

---

## Message Formatting

### Book Details Message (from `/book` command)

```
📚 *[Book Title]*
by [Author]

[Description]

📋 Copy: #[copy_number]
📊 Status: [Available / Borrowed]

[If borrowed by someone else:]
Due back: [due_date]
```

Telegram will automatically render image preview if you include the `imageUrl` in the message.

**Implementation (send photo + caption - recommended):**
```typescript
if (book.imageUrl) {
  await ctx.replyWithPhoto(book.imageUrl, {
    caption: formatBookDetails(book),
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '📖 Borrow This Book', callback_data: `borrow_${qrCodeId}` }
      ]]
    }
  });
} else {
  await ctx.reply(formatBookDetails(book), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '📖 Borrow This Book', callback_data: `borrow_${qrCodeId}` }
      ]]
    }
  });
}
```

### Search Results Message

```
🔍 Found 5 results for "inequality":

1. 📚 *Capital in the Twenty-First Century*
   by Thomas Piketty
   3 copies (2 available)
   /book BK-7X2M9K

2. 📚 *The Spirit Level*
   by Kate Pickett
   1 copy (0 available)
   /book BK-3H4KN7

...
```

**Implementation:**
```typescript
const resultText = results.map((book, index) => {
  const availability = book.availableCopies > 0 
    ? `${book.availableCopies} available` 
    : 'none available';
  
  return `${index + 1}. 📚 *${book.title}*
   by ${book.author}
   ${book.totalCopies} ${book.totalCopies === 1 ? 'copy' : 'copies'} (${availability})
   ${book.firstAvailableCopy ? `/book ${book.firstAvailableCopy}` : ''}`;
}).join('\n\n');

await ctx.reply(`🔍 Found ${results.length} results for "${query}":\n\n${resultText}`, {
  parse_mode: 'Markdown'
});
```

### My Books Message

```
📚 *Your Borrowed Books*

1. 📖 *Sapiens*
   Copy: BK-7X2M9K
   Due: Jan 15, 2024
   [ Return ]

2. 📖 *Thinking, Fast and Slow*
   Copy: BK-8M3P4R
   Due: Jan 18, 2024 ⚠️ (overdue)
   [ Return ]

Total: 2 books
```

**Implementation with inline keyboard:**
```typescript
const loanButtons = activeLoans.map((loan) => [{
  text: `Return: ${loan.title} (${loan.qrCodeId})`,
  callback_data: `return_${loan.qrCodeId}`
}]);

await ctx.reply(formatLoansMessage(activeLoans), {
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: loanButtons
  }
});
```

---

## Error Handling

### User-facing error messages:

1. **Book copy not found:**
   ```
   ❌ Book copy not found
   
   The QR code "BK-XXXXXX" doesn't exist in our system.
   Please contact an admin if you believe this is an error.
   ```

2. **Concurrent borrow (race condition):**
   ```
   ❌ Already borrowed
   
   Someone just borrowed this book! Please try another copy or check back later.
   ```

3. **Trying to borrow already borrowed book:**
   ```
   ❌ Currently unavailable
   
   This book is borrowed until [due_date].
   Use /search to find other copies.
   ```

4. **Invalid return (user doesn't have the book):**
   ```
   ❌ Cannot return
   
   You haven't borrowed this book. Use /mybooks to see your active loans.
   ```

5. **Empty search results:**
   ```
   🔍 No results found for "quantum physics"
   
   Try different keywords or browse all books on [website].
   ```

6. **Invalid command syntax:**
   ```
   ❌ Invalid command
   
   Usage: /book BK-7X2M9K
   
   Type /help to see all commands.
   ```

### Technical error handling:

```typescript
// Grammy error middleware
bot.catch((err) => {
  console.error('Bot error:', err);
  ctx.reply('⚠️ Something went wrong. Please try again or contact an admin.');
});

// In your handlers
try {
  const result = await borrowBook(db, qrCodeId, userId, username);
  if (!result.success) {
    await ctx.answerCallbackQuery({
      text: result.error,
      show_alert: true
    });
    return;
  }
  await ctx.answerCallbackQuery({ text: 'Book borrowed successfully!' });
} catch (error) {
  console.error('Borrow error:', error);
  await ctx.answerCallbackQuery({
    text: '⚠️ Something went wrong',
    show_alert: true
  });
}
```

---

## Bot Flow Examples

### Flow 1: Scan QR Code → Borrow

1. User scans QR code → Opens Telegram with `https://t.me/yourbot?start=borrow_BK-7X2M9K`
2. Bot receives `/start borrow_BK-7X2M9K`
3. Bot parses parameter, fetches book details via `getBookCopyDetails()`
4. Bot sends photo + details + "Borrow This Book" button
5. User clicks "Borrow This Book" button
6. Bot receives callback query with data `borrow_BK-7X2M9K`
7. Bot calls `borrowBook()` in transaction
8. Bot answers callback query with success message
9. Bot edits original message to show "Borrowed! Due Jan 15" and changes button to "Return This Book"

### Flow 2: Return Book

1. User sends `/mybooks`
2. Bot calls `getUserActiveLoans()` and shows list with "Return" buttons
3. User clicks "Return" button for a book
4. Bot receives callback query with data `return_BK-7X2M9K`
5. Bot calls `returnBook()` transaction
6. Bot answers callback query with success message
7. Bot edits message to remove returned book from list or show "✅ Returned!"

### Flow 3: Search

1. User sends message: "piketty" (no command prefix)
2. Bot detects it's not a command
3. Bot calls `searchBooks('piketty')`
4. Bot sends formatted list with `/book {qr_code}` commands for each result
5. User taps `/book BK-7X2M9K` → Bot handles as `/book` command (goes to Flow 1, step 3)

### Flow 4: Query Specific Book

1. User sends `/book BK-7X2M9K`
2. Bot calls `getBookCopyDetails('BK-7X2M9K')`
3. Bot checks current loan status and user ID
4. Bot determines button state (Borrow / Return / Unavailable)
5. Bot sends book details with appropriate inline keyboard
6. User interacts with button → Goes to Flow 1 (step 6) or Flow 2 (step 4)

---

## Callback Query Handler Pattern

```typescript
// Borrow button handler
bot.callbackQuery(/^borrow_/, async (ctx) => {
  const qrCodeId = ctx.callbackQuery.data.slice(7); // Remove "borrow_" prefix
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;

  const result = await borrowBook(db, qrCodeId, userId, username);
  
  if (!result.success) {
    await ctx.answerCallbackQuery({
      text: `❌ ${result.error}`,
      show_alert: true
    });
    return;
  }

  await ctx.answerCallbackQuery({ text: '✅ Book borrowed successfully!' });
  
  // Update message to show new state
  const bookDetails = await getBookCopyDetails(db, qrCodeId);
  await ctx.editMessageCaption({
    caption: formatBookDetails(bookDetails, true), // true = borrowed by this user
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Return This Book', callback_data: `return_${qrCodeId}` }
      ]]
    }
  });
});

// Return button handler
bot.callbackQuery(/^return_/, async (ctx) => {
  const qrCodeId = ctx.callbackQuery.data.slice(7); // Remove "return_" prefix
  const userId = ctx.from.id;

  const result = await returnBook(db, qrCodeId, userId);
  
  if (!result.success) {
    await ctx.answerCallbackQuery({
      text: `❌ ${result.error}`,
      show_alert: true
    });
    return;
  }

  await ctx.answerCallbackQuery({ text: '✅ Book returned successfully!' });
  
  // Update message to show new state
  const bookDetails = await getBookCopyDetails(db, qrCodeId);
  await ctx.editMessageCaption({
    caption: formatBookDetails(bookDetails, false),
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '📖 Borrow This Book', callback_data: `borrow_${qrCodeId}` }
      ]]
    }
  });
});

// Unavailable button handler (just shows info)
bot.callbackQuery(/^unavailable_/, async (ctx) => {
  await ctx.answerCallbackQuery({
    text: 'This book is currently borrowed by someone else',
    show_alert: true
  });
});
```

---

## Additional Considerations

### Rate Limiting
- Cloudflare Workers: No issue with generous limits
- Telegram API: 30 messages/second per bot (won't hit this in community library)
- Add throttling if sending bulk notifications in the future

### Concurrency
- Use D1 transactions for `borrowBook()` to prevent double-borrows
- Inline keyboard buttons can be clicked multiple times → Use `answerCallbackQuery()` immediately to acknowledge and prevent spam

### Image Handling
- Open Library API: `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`
- If image URL returns 404, catch error and send text-only message
- Telegram caches images, so repeated queries are fast

### Loan Duration
- Default: 14 days (configurable constant)
- No extension feature in MVP
- Can add `/extend BK-XXXXXX` command in Phase 2

### User Limits (Optional Enhancement)
- Limit active loans per user (e.g., max 3 books)
- Add check in `borrowBook()`:
```typescript
const userLoans = await tx.query.loans.findMany({
  where: and(
    eq(loans.telegramUserId, telegramUserId),
    isNull(loans.returnedAt)
  ),
});

if (userLoans.length >= 3) {
  throw new Error('MAX_LOANS_EXCEEDED');
}
```

### Data Privacy
- Telegram user IDs are unique integers (not PII)
- Usernames can change → Store but don't rely on for primary identity
- GDPR consideration: Add `/deleteme` command to wipe user data if needed

---

## Implementation Checklist

### Phase 1: Core Bot (MVP)
- [ ] Set up Grammy bot with Cloudflare Workers
- [ ] Set up Drizzle with D1 database
- [ ] Implement `/start` with deep link parameter parsing
- [ ] Implement `/book {qr_code}` with inline keyboards
- [ ] Implement borrow callback handler with transaction
- [ ] Implement return callback handler with transaction
- [ ] Implement `/mybooks` command
- [ ] Implement search (plain text messages)
- [ ] Implement `/help` command
- [ ] Add error handling for all edge cases
- [ ] Test concurrent borrow attempts
- [ ] Handle image fallback when imageUrl is null

### Phase 2: Enhancements
- [ ] Add user loan limits (max 3 active)
- [ ] Add book availability counts in all responses
- [ ] Improve search ranking/relevance
- [ ] Add `/extend` command for loan extensions
- [ ] Add better formatted due date displays (relative time)

### Phase 3: Notifications (Cron)
- [ ] Set up Cloudflare Cron Trigger
- [ ] Query loans due in 2 days and send reminders
- [ ] Query loans due today and send reminders
- [ ] Query overdue loans and send notifications
- [ ] Update `lastReminderSent` timestamp to avoid spam

---

## Database Query Performance Notes

**Indexes to consider** (already in schema):
- `idx_active_loans` on `loans(qr_code_id, returned_at)` - critical for checking availability

**Future indexes** (if performance issues arise):
- Index on `loans(telegram_user_id, returned_at)` for `/mybooks` queries
- FTS5 virtual table for better search performance

**Query optimization:**
- Drizzle's relational queries are efficient with proper `with` usage
- For search, limit results to prevent slow queries on large datasets
- Use `limit` parameter in all `findMany` calls where appropriate