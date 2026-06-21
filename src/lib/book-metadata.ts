import { supabase } from "@/integrations/supabase/client";

export interface BookMeta {
  title: string;
  author: string;
  publisher: string;
  year: string;
  category?: string;
  isbn?: string | null;
}

/** Raw shape of a row returned from the book_metadata table. */
interface BookMetaRow {
  title: string | null;
  author: string | null;
  publisher: string | null;
  year: string | null;
  category: string | null;
  isbn: string | null;
}

function rowToBookMeta(d: BookMetaRow): BookMeta {
  return {
    title:     d.title     ?? "",
    author:    d.author    ?? "",
    publisher: d.publisher ?? "",
    year:      d.year      ?? "",
    category:  d.category  ?? "",
    isbn:      d.isbn      ?? "",
  };
}

// book_metadata is not yet in the generated Supabase types; cast the
// client once here so downstream call-sites stay fully typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Look up a book by ISBN in the local Supabase metadata pool.
 * Returns null when not found.
 */
export async function lookupMetadataByIsbn(
  isbn: string
): Promise<BookMeta | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (clean.length < 10) return null;

  const { data } = (await db
    .from("book_metadata")
    .select("title, author, publisher, year, category, isbn")
    .eq("isbn", clean)
    .maybeSingle()) as { data: BookMetaRow | null };

  if (!data) return null;
  return rowToBookMeta(data);
}

/**
 * Fuzzy title search — used when a book has no barcode.
 * Returns up to `limit` matching titles.
 */
export async function searchMetadataByTitle(
  query: string,
  limit = 6,
  signal?: AbortSignal
): Promise<BookMeta[]> {
  if (query.trim().length < 2) return [];

  let request = db
    .from("book_metadata")
    .select("title, author, publisher, year, category, isbn")
    .ilike("title", `%${query.trim()}%`)
    .limit(limit);

  if (signal) {
    request = request.abortSignal(signal);
  }

  const { data } = (await request) as { data: BookMetaRow[] | null };

  return (data ?? []).map(rowToBookMeta);
}
