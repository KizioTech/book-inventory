export interface BookMeta {
  title: string;
  author: string;
  publisher: string;
  year: string;
}

/**
 * Lookup book metadata by ISBN.
 * Tries Google Books first, falls back to Open Library if Google
 * returns no results or rate-limits us.
 */
export async function lookupIsbn(isbn: string): Promise<BookMeta | null> {
  // Keep digits and X/x only (valid ISBN characters)
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (clean.length < 10) return null;

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
          title:     info.title ?? "",
          author:    (info.authors ?? []).join(", "),
          publisher: info.publisher ?? "",
          year:      (info.publishedDate ?? "").slice(0, 4),
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
      const entry = Object.values(data)[0] as any;
      const details = entry?.details;
      if (details?.title) {
        const authors: string = (details.authors ?? [])
          .map((a: any) => a.name ?? "")
          .filter(Boolean)
          .join(", ");
        const publisher: string =
          (details.publishers ?? []).map((p: any) => p.name ?? p).join(", ");
        const year: string =
          details.publish_date
            ? String(details.publish_date).replace(/\D/g, "").slice(0, 4)
            : "";
        return {
          title:  details.title ?? "",
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
