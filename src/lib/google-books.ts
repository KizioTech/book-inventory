import { lookupMetadataByIsbn, type BookMeta } from "./book-metadata";
import { supabase } from "@/integrations/supabase/client";

async function fetchWithTimeout(url: string, ms = 2500): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok ? res : null;
  } catch {
    return null; // timeout, network error, abort — all treated as "no result"
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGoogleBooks(isbn: string): Promise<BookMeta | null> {
  const res = await fetchWithTimeout(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&country=US&maxResults=1`,
  );
  if (!res) return null;
  const data = await res.json();
  const info = data?.items?.[0]?.volumeInfo;
  if (!info?.title) return null;
  return {
    title: info.title ?? "",
    author: (info.authors ?? []).join(", "),
    publisher: info.publisher ?? "",
    year: (info.publishedDate ?? "").slice(0, 4),
  };
}

async function fetchOpenLibrary(isbn: string): Promise<BookMeta | null> {
  const res = await fetchWithTimeout(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=details&format=json`,
  );
  if (!res) return null;
  const data = await res.json();
  const entry = Object.values(data)[0] as Record<string, unknown> | undefined;
  const details = entry?.details as Record<string, unknown> | undefined;
  if (!details?.title) return null;

  const authors = ((details.authors as Record<string, unknown>[]) ?? [])
    .map((a) => (a.name as string) ?? "")
    .filter(Boolean)
    .join(", ");
  const publisher = ((details.publishers as Record<string, unknown>[]) ?? [])
    .map((p) => (p.name as string) ?? String(p))
    .join(", ");
  const match = String(details.publish_date).match(/\b\d{4}\b/);

  return {
    title: details.title as string,
    author: authors,
    publisher,
    year: match ? match[0] : "",
  };
}

async function cacheToLocalPool(isbn: string, meta: BookMeta): Promise<void> {
  try {
    await supabase
      .from("book_metadata")
      .upsert(
        {
          isbn,
          title: meta.title,
          author: meta.author || null,
          publisher: meta.publisher || null,
          year: meta.year || null,
          category: meta.category || null,
        },
        { onConflict: "isbn", ignoreDuplicates: true },
      );
  } catch {
    // Best-effort cache fill — never let this block or fail the lookup itself
  }
}

/**
 * Lookup book metadata by ISBN.
 * Tries the local Supabase pool first (fastest, works offline), then races
 * Google Books and Open Library so a slow/rate-limited provider doesn't block
 * the result.
 */
export async function lookupIsbn(isbn: string): Promise<BookMeta | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (clean.length < 10) return null;

  // 0. Local Supabase pool
  try {
    const local = await lookupMetadataByIsbn(clean);
    if (local?.title) return local;
  } catch {
    // offline or RLS error — fall through to external providers
  }

  // 1. Race external providers (each resolves null instead of throwing on miss)
  const results = await Promise.allSettled([
    fetchGoogleBooks(clean),
    fetchOpenLibrary(clean),
  ]);

  for (const r of results) {
    if (r.status === "fulfilled" && r.value?.title) {
      void cacheToLocalPool(clean, r.value); // don't await — don't block the UI
      return r.value;
    }
  }

  return null;
}
