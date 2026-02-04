-- 1. Disable foreign key constraints to avoid 'RESTRICT' errors during the nuke
PRAGMA foreign_keys = OFF;

-- 2. Drop tables in reverse order of dependency (optional, but cleaner)
DROP TABLE IF EXISTS "loans";
DROP TABLE IF EXISTS "book_copies";
DROP TABLE IF EXISTS "books";
DROP TABLE IF EXISTS "locations";

-- 3. Drop Drizzle's internal migration tracker
-- (Optional: only do this if you plan to re-run 'migrations apply' from scratch)
DROP TABLE IF EXISTS "d1_migrations";

-- 4. Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
