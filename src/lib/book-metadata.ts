import { supabase } from "@/integrations/supabase/client";

export interface BookMeta {
  title: string;
  author: string;
  publisher: string;
  year: string;
  category?: string;
  isbn?: string | null;
}

/**
 * Look up a book by ISBN in the local Supabase metadata pool.
 * Returns null when not found.
 */
export async function lookupMetadataByIsbn(
  isbn: string
): Promise<BookMeta | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (clean.length < 10) return null;

  const { data } = await supabase
    .from("book_metadata")
    .select("title, author, publisher, year, category")
    .eq("isbn", clean)
    .maybeSingle();

  if (!data) return null;
  return {
    title:     data.title     ?? "",
    author:    data.author    ?? "",
    publisher: data.publisher ?? "",
    year:      data.year      ?? "",
    category:  data.category  ?? "",
  };
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

  let request = supabase
    .from("book_metadata")
    .select("title, author, publisher, year, category")
    .ilike("title", `%${query.trim()}%`)
    .limit(limit);

  if (signal) {
    request = request.abortSignal(signal);
  }

  const { data } = await request;

  return (data ?? []).map((d) => ({
    title:     d.title     ?? "",
    author:    d.author    ?? "",
    publisher: d.publisher ?? "",
    year:      d.year      ?? "",
    category:  d.category  ?? "",
  }));
}
