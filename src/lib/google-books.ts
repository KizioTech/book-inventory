import { lookupMetadataByIsbn, type BookMeta } from "./book-metadata";

/**
 * Lookup book metadata by ISBN.
 * Tries Google Books first, falls back to Open Library if Google
 * returns no results or rate-limits us.
 */
export async function lookupIsbn(isbn: string): Promise<BookMeta | null> {
  // Keep digits and X/x only (valid ISBN characters)
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (clean.length < 10) return null;

  // ── 0. Local Supabase pool (fastest; works offline) ─────────────────────
  try {
    const local = await lookupMetadataByIsbn(clean);
    if (local?.title) return local;
  } catch {
    // offline or RLS error — fall through
  }

  // ── 1. Try Google Books ──────────────────────────────────────────────────
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(clean)}&country=US&maxResults=1`,
    );
    if (res.ok) {
      const data = await res.json();
      const info = data?.items?.[0]?.volumeInfo;
      if (info?.title) {
        return {
          title: info.title ?? "",
          author: (info.authors ?? []).join(", "),
          publisher: info.publisher ?? "",
          year: (info.publishedDate ?? "").slice(0, 4),
        };
      }
    }
  } catch {
    // Network error — fall through to Open Library
  }

  // ── 2. Fallback: Open Library ────────────────────────────────────────────
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(clean)}&jscmd=details&format=json`,
    );
    if (res.ok) {
      const data = await res.json();
      const entry = Object.values(data)[0] as Record<string, unknown>;
      const details = entry?.details as Record<string, unknown> | undefined;
      if (details?.title) {
        const authors: string = (
          (details.authors as Record<string, unknown>[]) ?? []
        )
          .map((a) => (a.name as string) ?? "")
          .filter(Boolean)
          .join(", ");
        const publisher: string = (
          (details.publishers as Record<string, unknown>[]) ?? []
        )
          .map((p) => (p.name as string) ?? String(p))
          .join(", ");
        const match = String(details.publish_date).match(/\b\d{4}\b/);
        const year: string = details.publish_date && match
          ? match[0]
          : "";
        return {
          title: (details.title as string) ?? "",
          author: authors,
          publisher,
          year,
        };
      }
    }
  } catch {
    // Both APIs failed
  }

  return null;
}
