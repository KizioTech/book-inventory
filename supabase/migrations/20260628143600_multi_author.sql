-- Migration to add author_2 through author_5 columns to books and book_metadata

-- Update books table
ALTER TABLE public.books ADD COLUMN author_2 TEXT;
ALTER TABLE public.books ADD COLUMN author_3 TEXT;
ALTER TABLE public.books ADD COLUMN author_4 TEXT;
ALTER TABLE public.books ADD COLUMN author_5 TEXT;

-- Update book_metadata table
ALTER TABLE public.book_metadata ADD COLUMN author_2 TEXT;
ALTER TABLE public.book_metadata ADD COLUMN author_3 TEXT;
ALTER TABLE public.book_metadata ADD COLUMN author_4 TEXT;
ALTER TABLE public.book_metadata ADD COLUMN author_5 TEXT;

-- Function to backfill existing data by splitting comma-separated authors
DO $$
DECLARE
    r RECORD;
    authors TEXT[];
BEGIN
    FOR r IN SELECT id, author FROM public.books WHERE author IS NOT NULL LOOP
        -- Split string into array, trim whitespace
        authors := string_to_array(r.author, ';');
        
        UPDATE public.books
        SET author = TRIM(authors[1]),
            author_2 = CASE WHEN array_length(authors, 1) >= 2 THEN TRIM(authors[2]) ELSE NULL END,
            author_3 = CASE WHEN array_length(authors, 1) >= 3 THEN TRIM(authors[3]) ELSE NULL END,
            author_4 = CASE WHEN array_length(authors, 1) >= 4 THEN TRIM(authors[4]) ELSE NULL END,
            author_5 = CASE WHEN array_length(authors, 1) >= 5 THEN TRIM(authors[5]) ELSE NULL END
        WHERE id = r.id;
    END LOOP;

    FOR r IN SELECT id, author FROM public.book_metadata WHERE author IS NOT NULL LOOP
        -- Split string into array, trim whitespace
        authors := string_to_array(r.author, ';');
        
        UPDATE public.book_metadata
        SET author = TRIM(authors[1]),
            author_2 = CASE WHEN array_length(authors, 1) >= 2 THEN TRIM(authors[2]) ELSE NULL END,
            author_3 = CASE WHEN array_length(authors, 1) >= 3 THEN TRIM(authors[3]) ELSE NULL END,
            author_4 = CASE WHEN array_length(authors, 1) >= 4 THEN TRIM(authors[4]) ELSE NULL END,
            author_5 = CASE WHEN array_length(authors, 1) >= 5 THEN TRIM(authors[5]) ELSE NULL END
        WHERE id = r.id;
    END LOOP;
END $$;
