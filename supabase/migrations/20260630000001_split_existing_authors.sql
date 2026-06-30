-- Split multiple authors (separated by commas or semicolons) into their respective columns for book_metadata
UPDATE public.book_metadata
SET 
  author   = nullif(trim(split_part(replace(author, ';', ','), ',', 1)), ''),
  author_2 = nullif(trim(split_part(replace(author, ';', ','), ',', 2)), ''),
  author_3 = nullif(trim(split_part(replace(author, ';', ','), ',', 3)), ''),
  author_4 = nullif(trim(split_part(replace(author, ';', ','), ',', 4)), ''),
  author_5 = nullif(trim(split_part(replace(author, ';', ','), ',', 5)), '')
WHERE author LIKE '%,%' OR author LIKE '%;%';

-- Do the same for the actual books table so existing exports are fixed
UPDATE public.books
SET 
  author   = nullif(trim(split_part(replace(author, ';', ','), ',', 1)), ''),
  author_2 = nullif(trim(split_part(replace(author, ';', ','), ',', 2)), ''),
  author_3 = nullif(trim(split_part(replace(author, ';', ','), ',', 3)), ''),
  author_4 = nullif(trim(split_part(replace(author, ';', ','), ',', 4)), ''),
  author_5 = nullif(trim(split_part(replace(author, ';', ','), ',', 5)), '')
WHERE author LIKE '%,%' OR author LIKE '%;%';
