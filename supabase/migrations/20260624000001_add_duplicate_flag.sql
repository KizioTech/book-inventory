-- Add flagged_as_duplicate column to books table.
-- Records saved despite a duplicate warning are tagged here.
-- All existing records default to false (not flagged).
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS flagged_as_duplicate boolean NOT NULL DEFAULT false;

-- Index for fast lookups of flagged records in the admin records table
CREATE INDEX IF NOT EXISTS idx_books_flagged ON books(flagged_as_duplicate)
  WHERE flagged_as_duplicate = true;
