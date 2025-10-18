-- Seed data for community library database
-- This script creates sample data for testing and development

-- Insert the book
INSERT INTO books (id, isbn, title, description, author, image_url, created_at) VALUES (
  1,
  '9789811158049',
  'This is what inequality looks like',
  'A powerful and intimate exploration of inequality in Singapore through the lens of sociology. Teo You Yenn examines the lived experiences of low-income families, challenging common misconceptions and revealing the structural barriers that perpetuate poverty. Through ethnographic research and compassionate storytelling, this groundbreaking work humanizes those often rendered invisible in policy debates and offers a compelling call for greater empathy and social justice.',
  'Teo You Yenn',
  'https://covers.openlibrary.org/b/isbn/9789811158049-L.jpg',
  strftime('%s', 'now')
);

-- Insert two copies of the book
INSERT INTO book_copies (qr_code_id, book_id, copy_number, status) VALUES
  ('BOOK-001-COPY-1', 1, 1, 'available'),
  ('BOOK-001-COPY-2', 1, 2, 'borrowed');

-- Insert loan history for Copy 1 (BOOK-001-COPY-1)
-- Two past loans, both returned
INSERT INTO loans (id, qr_code_id, telegram_user_id, telegram_username, borrowed_at, due_date, returned_at, last_reminder_sent) VALUES
  (
    1,
    'BOOK-001-COPY-1',
    123456789,
    'alice_reader',
    strftime('%s', 'now', '-45 days'),
    strftime('%s', 'now', '-31 days'),
    strftime('%s', 'now', '-32 days'),
    NULL
  ),
  (
    2,
    'BOOK-001-COPY-1',
    987654321,
    'bob_bookworm',
    strftime('%s', 'now', '-25 days'),
    strftime('%s', 'now', '-11 days'),
    strftime('%s', 'now', '-12 days'),
    NULL
  );

-- Insert loan history for Copy 2 (BOOK-001-COPY-2)
-- One past loan (returned) and one outstanding loan (not returned)
INSERT INTO loans (id, qr_code_id, telegram_user_id, telegram_username, borrowed_at, due_date, returned_at, last_reminder_sent) VALUES
  (
    3,
    'BOOK-001-COPY-2',
    555666777,
    'charlie_student',
    strftime('%s', 'now', '-60 days'),
    strftime('%s', 'now', '-46 days'),
    strftime('%s', 'now', '-44 days'),
    NULL
  ),
  (
    4,
    'BOOK-001-COPY-2',
    111222333,
    'dana_scholar',
    strftime('%s', 'now', '-10 days'),
    strftime('%s', 'now', '+4 days'),
    NULL,
    strftime('%s', 'now', '-3 days')
  );
