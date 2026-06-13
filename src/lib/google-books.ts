export interface BookMeta {
  title: string;
  author: string;
  publisher: string;
  year: string;
}

export async function lookupIsbn(isbn: string): Promise<BookMeta | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (!clean) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(clean)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0]?.volumeInfo;
    if (!item) return null;
    return {
      title: item.title ?? "",
      author: (item.authors ?? []).join(", "),
      publisher: item.publisher ?? "",
      year: (item.publishedDate ?? "").slice(0, 4),
    };
  } catch {
    return null;
  }
}
