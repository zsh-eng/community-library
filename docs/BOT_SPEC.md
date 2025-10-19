# Telegram Bot Specification for Community Library

## Overview
A Telegram bot that allows users to borrow and return books by scanning QR codes, search the library catalog, and manage their loans—all without authentication (we simply store Telegram user ID and username).

---

## Bot Commands

### Core Commands

1. **`/start`** or **`/start borrow_{QR_CODE_ID}`**
   - Entry point, shows welcome message and `/help`
   - If deep link parameter present (from QR code scan), initiate borrow flow by showing book copy details

2. **`/book {isbn}` or `/book{isbn}` (with or without space)**
   - Query book by ISBN to see all copies and their availability
   - Returns: title, author, description, cover image
   - Shows list of all copies with their status (available/borrowed) and due dates
   - Does NOT show QR code IDs (those are only for physical interaction)
   - Does NOT show borrow/return buttons (use `/borrow` for that)
   - The no-space version (`/book{isbn}`) is used in search results to make the entire command tappable

3. **`/borrow {qr_code_id}`**
   - Query specific book copy by QR code ID (scanned from physical book)
   - Returns: title, author, description, cover image, copy number, status
   - Shows inline keyboard with action buttons based on state (see Button Logic below)
   - This command handles both looking up a copy AND provides borrow/return functionality
   - Acts as confirmation step before borrowing (prevents accidental scans)

4. **`/mybooks`**
   - List user's active loans
   - For each: title, QR code, borrowed date, due date
   - Inline keyboard with "Return" button for each book

5. **`/help`**
   - List all available commands with descriptions

6. **Plain text messages (no command)**
   - Treated as search query
   - Returns list of matching books with basic info (by ISBN)
   - Each result shows `/book{isbn}` command to get details (no space for tappability)

---

## Button Logic (Inline Keyboards)

**Important:** Inline keyboard buttons do NOT trigger slash commands. They trigger **callback queries** that your bot handles separately. When a user clicks "Borrow This Book", Telegram sends a callback query with the callback_data (e.g., `borrow_BK-7X2M9K`) to your bot, and you handle it in a callback query handler.

When a user queries a book copy via `/borrow {qr_code_id}`, show inline keyboard based on state:

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

Implement functions in the `/worker/lib` directory.

### Required Imports

```typescript
import { eq, and, isNull, like, or, sql, desc } from 'drizzle-orm';
import { books, bookCopies, loans } from './db/schema';
```

### 1. **`getBookCopyDetails(qrCodeId: string)`**

Returns book copy with joined book details and current loan status. Used by `/borrow` command.

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

**Usage:**
```typescript
const copyDetails = await getBookCopyDetails(db, 'BK-7X2M9K');
if (!copyDetails) {
  return ctx.reply('❌ Book copy not found. Please check the QR code.');
}

// Determine button state
const isAvailable = !copyDetails.currentLoan;
const isBorrowedByCurrentUser = copyDetails.currentLoan?.telegramUserId === ctx.from.id;
```

---

### 2. **`getBookDetails(isbn: string)`**

Returns book details with all copies and their availability. Used by `/book` command.

```typescript
async function getBookDetails(db: DrizzleD1Database, isbn: string) {
  const book = await db.query.books.findFirst({
    where: eq(books.isbn, isbn),
    with: {
      copies: {
        with: {
          loans: {
            where: isNull(loans.returnedAt),
            limit: 1,
          },
        },
      },
    },
  });

  if (!book) {
    return null;
  }

  // Calculate availability summary
  const totalCopies = book.copies.length;
  const availableCopies = book.copies.filter(
    (copy) => copy.status === 'available' && copy.loans.length === 0
  ).length;

  // Map copies with their loan info (but don't expose QR codes)
  const copiesInfo = book.copies.map((copy) => ({
    copyNumber: copy.copyNumber,
    status: copy.status,
    isAvailable: copy.status === 'available' && copy.loans.length === 0,
    dueDate: copy.loans[0]?.dueDate || null,
  }));

  return {
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    description: book.description,
    imageUrl: book.imageUrl,
    totalCopies,
    availableCopies,
    copies: copiesInfo,
  };
}
```

**Usage:**
```typescript
const bookDetails = await getBookDetails(db, '9780674430006');
if (!bookDetails) {
  return ctx.reply('❌ Book not found.');
}

// Format and send message showing all copies
```

---

### 3. **`borrowBook(qrCodeId: string, telegramUserId: number, telegramUsername: string)`**

Handles borrowing logic with concurrency checks.

```typescript
async function borrowBook(
  db: DrizzleD1Database,
  qrCodeId: string,
  telegramUserId: number,
  telegramUsername: string
) {
  // 1. Verify book copy exists and is available
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
    return { success: false, error: 'Book copy not found' };
  }

  if (bookCopy.loans.length > 0) {
    const currentLoan = bookCopy.loans[0];
    if (currentLoan.telegramUserId === telegramUserId) {
      return { success: false, error: 'You have already borrowed this book' };
    }
    return {
      success: false,
      error: `This book is currently borrowed (due back ${new Date(currentLoan.dueDate).toLocaleDateString()})`,
    };
  }

  // 2. Create loan record
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14); // 2-week loan period

  const [loan] = await db.insert(loans).values({
    qrCodeId,
    telegramUserId,
    telegramUsername,
    borrowedAt: new Date(),
    dueDate,
  }).returning();

  return {
    success: true,
    loan,
    book: bookCopy.book,
    copyNumber: bookCopy.copyNumber,
  };
}
```

---

### 4. **`returnBook(qrCodeId: string, telegramUserId: number)`**

Handles return logic with validation.

```typescript
async function returnBook(
  db: DrizzleD1Database,
  qrCodeId: string,
  telegramUserId: number
) {
  // Find active loan for this book copy by this user
  const activeLoan = await db.query.loans.findFirst({
    where: and(
      eq(loans.qrCodeId, qrCodeId),
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
  });

  if (!activeLoan) {
    return { success: false, error: 'No active loan found for this book' };
  }

  // Update loan record
  await db.update(loans)
    .set({ returnedAt: new Date() })
    .where(eq(loans.id, activeLoan.id));

  return {
    success: true,
    book: activeLoan.bookCopy.book,
    borrowedAt: activeLoan.borrowedAt,
    returnedAt: new Date(),
  };
}
```

---

### 5. **`searchBooks(query: string, limit: number = 10)`**

Search books by title or author. Returns books grouped by ISBN with availability info.

```typescript
async function searchBooks(
  db: DrizzleD1Database,
  query: string,
  limit: number = 10
) {
  const searchPattern = `%${query}%`;

  const results = await db.query.books.findMany({
    where: or(
      like(books.title, searchPattern),
      like(books.author, searchPattern)
    ),
    limit,
    with: {
      copies: {
        with: {
          loans: {
            where: isNull(loans.returnedAt),
            limit: 1,
          },
        },
      },
    },
  });

  // Transform results to include availability
  return results.map((book) => {
    const totalCopies = book.copies.length;
    const availableCopies = book.copies.filter(
      (copy) => copy.status === 'available' && copy.loans.length === 0
    ).length;

    return {
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      imageUrl: book.imageUrl,
      totalCopies,
      availableCopies,
    };
  });
}
```

**Usage:**
```typescript
const results = await searchBooks(db, 'piketty', 10);
// Format and display results with /book{isbn} commands
```

---

### 6. **`getUserActiveLoans(telegramUserId: number)`**

Get all active loans for a user.

```typescript
async function getUserActiveLoans(
  db: DrizzleD1Database,
  telegramUserId: number
) {
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
    orderBy: [desc(loans.borrowedAt)],
  });

  return activeLoans.map((loan) => ({
    qrCodeId: loan.qrCodeId,
    title: loan.bookCopy.book.title,
    author: loan.bookCopy.book.author,
    copyNumber: loan.bookCopy.copyNumber,
    borrowedAt: loan.borrowedAt,
    dueDate: loan.dueDate,
  }));
}
```

---

## Message Formatting

### Book Copy Details Message (from `/borrow` command)

Shows a specific copy with action buttons.

```
📚 *[Book Title]*
by [Author]

[Description]

📋 Copy #[copy_number]
📊 Status: [Available / Borrowed]

[If borrowed by someone else:]
Due back: [due_date]
```

**Implementation (send photo + caption):**
```typescript
if (copyDetails.book.imageUrl) {
  await ctx.replyWithPhoto(copyDetails.book.imageUrl, {
    caption: formatBookCopyDetails(copyDetails),
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '📖 Borrow This Book', callback_data: `borrow_${qrCodeId}` }
      ]]
    }
  });
} else {
  await ctx.reply(formatBookCopyDetails(copyDetails), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '📖 Borrow This Book', callback_data: `borrow_${qrCodeId}` }
      ]]
    }
  });
}
```

---

### Book Details Message (from `/book` command)

Shows all copies of a book by ISBN.

```
📚 *[Book Title]*
by [Author]

[Description]

📊 Availability: [X] of [Y] copies available

Copies:
📖 Copy 1: ✅ Available
📖 Copy 2: 📅 Borrowed (due back [date])
📖 Copy 3: ✅ Available

💡 To borrow, scan the QR code on the physical book
```

**Implementation:**
```typescript
const copiesText = bookDetails.copies
  .map((copy, idx) => {
    const statusEmoji = copy.isAvailable ? '✅' : '📅';
    const statusText = copy.isAvailable
      ? 'Available'
      : `Borrowed (due back ${new Date(copy.dueDate).toLocaleDateString()})`;
    return `📖 Copy ${copy.copyNumber}: ${statusEmoji} ${statusText}`;
  })
  .join('\n');

const message = `📚 *${bookDetails.title}*
by ${bookDetails.author}

${bookDetails.description}

📊 Availability: ${bookDetails.availableCopies} of ${bookDetails.totalCopies} ${bookDetails.totalCopies === 1 ? 'copy' : 'copies'} available

Copies:
${copiesText}

💡 To borrow, scan the QR code on the physical book`;

if (bookDetails.imageUrl) {
  await ctx.replyWithPhoto(bookDetails.imageUrl, {
    caption: message,
    parse_mode: 'Markdown',
  });
} else {
  await ctx.reply(message, { parse_mode: 'Markdown' });
}
```

---

### Search Results Message

```
🔍 Found 5 results for "inequality":

1. 📚 *Capital in the Twenty-First Century*
   by Thomas Piketty
   3 copies (2 available)
   /book9780674430006

2. 📚 *The Spirit Level*
   by Kate Pickett
   1 copy (0 available)
   /book9781608193417

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
   /book${book.isbn}`;
}).join('\n\n');

await ctx.reply(`🔍 Found ${results.length} results for "${query}":\n\n${resultText}`, {
  parse_mode: 'Markdown'
});
```

Note: `/book${book.isbn}` has no space to make it tappable as a single command in Telegram.

---

### My Books Message

```
📚 Your borrowed books:

1. *Capital in the Twenty-First Century*
   📋 QR: BK-7X2M9K
   📅 Borrowed: Jan 15, 2024
   ⏰ Due: Jan 29, 2024
   [ ✅ Return This Book ]

2. *The Spirit Level*
   📋 QR: BK-3H4KN7
   📅 Borrowed: Jan 18, 2024
   ⏰ Due: Feb 1, 2024
   [ ✅ Return This Book ]
```

**Implementation:**
```typescript
const loanButtons = activeLoans.map((loan) => ([
  {
    text: `✅ Return: ${loan.title}`,
    callback_data: `return_${loan.qrCodeId}`
  }
]));

const loanText = activeLoans.map((loan, idx) => {
  return `${idx + 1}. *${loan.title}*
   📋 QR: ${loan.qrCodeId}
   📅 Borrowed: ${new Date(loan.borrowedAt).toLocaleDateString()}
   ⏰ Due: ${new Date(loan.dueDate).toLocaleDateString()}`;
}).join('\n\n');

await ctx.reply(`📚 Your borrowed books:\n\n${loanText}`, {
  parse_mode: 'Markdown',
  reply_markup: {
    inline_keyboard: loanButtons
  }
});
```

---

## Error Handling

### User-facing error messages:
- **Book not found**: "❌ Book not found. Please check the QR code / ISBN."
- **Already borrowed by user**: "📖 You've already borrowed this book!"
- **Borrowed by someone else**: "⏳ This book is currently borrowed and will be available on [due_date]."
- **No active loan**: "❌ You don't have an active loan for this book."
- **Database error**: "❌ Something went wrong. Please try again later."

### Technical error handling:

```typescript
// Wrap all database operations in try-catch
try {
  const result = await borrowBook(db, qrCodeId, userId, username);
  if (!result.success) {
    return ctx.reply(result.error);
  }
  // ... success handling
} catch (error) {
  console.error('Error in borrow handler:', error);
  return ctx.reply('❌ Something went wrong. Please try again later.');
}
```

**Key points:**
- Always catch database errors
- Log errors for debugging (use `console.error` with context)
- Never expose internal error details to users
- Provide actionable error messages when possible

**Concurrency handling:**

Since SQLite doesn't have row-level locking, we rely on the `UNIQUE` constraint on active loans and handle constraint violations:

```typescript
try {
  await db.insert(loans).values({...});
} catch (error) {
  if (error.code === 'SQLITE_CONSTRAINT') {
    return { success: false, error: 'This book was just borrowed by someone else' };
  }
  throw error;
}
```

Consider adding a database constraint:
```sql
CREATE UNIQUE INDEX idx_active_loans ON loans(qr_code_id)
WHERE returned_at IS NULL;
```

---

## Bot Flow Examples

### Flow 1: Scan QR Code → Borrow

1. User scans QR code on physical book
2. Opens `https://t.me/YourBot?start=borrow_BK-7X2M9K`
3. Bot calls `getBookCopyDetails('BK-7X2M9K')`
4. Bot sends book copy details with "Borrow This Book" button
5. User clicks "Borrow This Book" button
6. Bot receives callback query with `borrow_BK-7X2M9K`
7. Bot calls `borrowBook('BK-7X2M9K', userId, username)`
8. Bot updates message: "✅ Successfully borrowed! Due back on [date]"

### Flow 2: Return Book

1. User sends `/mybooks`
2. Bot calls `getUserActiveLoans(userId)`
3. Bot displays list with "Return" buttons
4. User clicks "Return This Book" for specific book
5. Bot receives callback query with `return_BK-7X2M9K`
6. Bot calls `returnBook('BK-7X2M9K', userId)`
7. Bot updates message: "✅ Book returned. Thanks!"

Alternative: User can also scan QR code again, see "Return This Book" button, and return from there.

### Flow 3: Search

1. User sends plain text: "piketty"
2. Bot calls `searchBooks('piketty')`
3. Bot displays results with `/book{isbn}` commands (no space)
4. User taps `/book9780674430006`
5. Bot calls `getBookDetails('9780674430006')`
6. Bot displays book info with all copies and availability

### Flow 4: Query Specific Book Copy

1. User sends `/borrow BK-7X2M9K` (or scans QR code)
2. Bot calls `getBookCopyDetails('BK-7X2M9K')`
3. Bot checks current loan status and user ID
4. Bot determines button state (Borrow / Return / Unavailable)
5. Bot sends book copy details with appropriate inline keyboard
6. User interacts with button → Callback query handled

---

## Callback Query Handler Pattern

All button clicks are handled via callback queries, not commands:

```typescript
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith('borrow_')) {
    const qrCodeId = data.replace('borrow_', '');
    const result = await borrowBook(
      db,
      qrCodeId,
      ctx.from.id,
      ctx.from.username || 'unknown'
    );

    if (result.success) {
      await ctx.answerCbQuery('✅ Book borrowed!');
      await ctx.editMessageCaption(
        `✅ Successfully borrowed *${result.book.title}*!\n\nDue back: ${new Date(result.loan.dueDate).toLocaleDateString()}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Return This Book', callback_data: `return_${qrCodeId}` }
            ]]
          }
        }
      );
    } else {
      await ctx.answerCbQuery(result.error, { show_alert: true });
    }
  }

  else if (data.startsWith('return_')) {
    const qrCodeId = data.replace('return_', '');
    const result = await returnBook(db, qrCodeId, ctx.from.id);

    if (result.success) {
      await ctx.answerCbQuery('✅ Book returned!');
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.reply(
        `✅ Successfully returned *${result.book.title}*!\n\nBorrowed: ${new Date(result.borrowedAt).toLocaleDateString()}\nReturned: ${new Date(result.returnedAt).toLocaleDateString()}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.answerCbQuery(result.error, { show_alert: true });
    }
  }

  else if (data.startsWith('unavailable_')) {
    await ctx.answerCbQuery('This book is currently borrowed by someone else', { show_alert: true });
  }
});
```

**Key methods:**
- `ctx.answerCbQuery()` - Shows a popup notification or alert
- `ctx.editMessageText()` - Updates the message text
- `ctx.editMessageCaption()` - Updates photo caption
- `ctx.editMessageReplyMarkup()` - Updates only the buttons

---

## Additional Considerations

### Rate Limiting
- Telegram enforces global rate limits (30 messages/second to different users)
- For individual users, be mindful of flooding
- Consider debouncing search queries if implementing live search

### Concurrency
- Multiple users might try to borrow the same book simultaneously
- Solution: Add unique constraint on active loans (see Error Handling)
- Always re-check availability before creating loan record

### Image Handling
- Book covers are stored as URLs (from Open Library API)
- Use `ctx.replyWithPhoto()` when `imageUrl` is available
- Fallback to text-only message if image fails to load
- Telegram caches images, so subsequent loads are fast

### Loan Duration
- Default: 14 days (2 weeks)
- Configurable per library needs
- Due date is informational only (no automatic enforcement in MVP)

### User Limits (Optional Enhancement)
Consider limiting number of concurrent loans per user:

```typescript
const userLoans = await getUserActiveLoans(db, userId);
if (userLoans.length >= 3) {
  return { success: false, error: 'You can only borrow up to 3 books at a time' };
}
```

### Data Privacy
- Only store necessary user data: Telegram user ID and username
- Username may be null (user can hide it) - handle gracefully
- No passwords or personal information required

---

## Implementation Checklist

### Phase 1: Core Bot (MVP)
- [ ] Set up Telegram bot with Telegraf/Grammy
- [ ] Implement `/start` command with deep link handling
- [ ] Implement `/borrow {qr_code_id}` command (book copy lookup)
- [ ] Implement `/book {isbn}` command (book lookup by ISBN)
- [ ] Implement callback query handlers (borrow, return, unavailable)
- [ ] Implement `/mybooks` command
- [ ] Implement plain text search
- [ ] Add all backend functions
- [ ] Test concurrency scenarios
- [ ] Deploy to Cloudflare Workers

### Phase 2: Enhancements
- [ ] Add `/help` command with detailed instructions
- [ ] Implement user loan limits
- [ ] Add book cover image support
- [ ] Better error messages and edge case handling
- [ ] Add logging/monitoring

### Phase 3: Notifications (Cron)
- [ ] Set up daily cron job to check overdue books
- [ ] Send reminder messages 1 day before due date
- [ ] Send overdue notifications

---

## Database Query Performance Notes

**Indexes to consider:**
```sql
CREATE INDEX idx_loans_user_active ON loans(telegram_user_id) WHERE returned_at IS NULL;
CREATE INDEX idx_loans_qr_active ON loans(qr_code_id) WHERE returned_at IS NULL;
CREATE INDEX idx_book_copies_book_id ON book_copies(book_id);
CREATE INDEX idx_books_isbn ON books(isbn);
```

These indexes will speed up:
- User's active loans query (`/mybooks`)
- Book copy availability checks (`/borrow`)
- Book details by ISBN (`/book`)
- Search queries (if search volume is high)

---

## Summary of Key Differences

### `/book {isbn}` vs `/borrow {qr_code_id}`

| Feature | `/book {isbn}` | `/borrow {qr_code_id}` |
|---------|----------------|------------------------|
| **Identifier** | ISBN | QR Code ID |
| **Shows** | All copies of the book | One specific physical copy |
| **Availability** | Summary across all copies | Specific copy status |
| **Action Buttons** | No | Yes (Borrow/Return/Unavailable) |
| **QR Code IDs** | Hidden | Shown for current copy |
| **Use Case** | Browse/search catalog | Interact with physical book |
| **Entry Point** | Search results, direct command | QR code scan, direct command |

This separation ensures:
1. **Clearer intent**: `/borrow` = you have the physical book
2. **Better UX**: Search results show book-level info (by ISBN)
3. **Security**: Prevents accidental borrows (confirmation via button)
4. **Privacy**: QR codes only visible when user has physical access
