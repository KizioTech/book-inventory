self.onmessage = async (e: MessageEvent<{ file: File; batchSize: number }>) => {
  const { file, batchSize = 50 } = e.data;
  
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      self.postMessage({ type: 'done', total: 0 });
      return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map(row => {
        const cols = row.split(',').map(v => v.trim().replace(/^"|"$/g, ""));
        const idx = (name: string) => headers.indexOf(name);
        const rawIsbn = cols[idx("isbn")]?.trim()?.replace(/[^0-9Xx]/g, "");
        const isbn = rawIsbn ? rawIsbn : null;
        const rawAuthor = cols[idx("author")] || "";
        const authors = rawAuthor.split(";").map(a => a.trim()).filter(Boolean);
        return {
          isbn,
          title:     cols[idx("book_title")]     || "",
          author:    authors[0] || null,
          author_2:  authors[1] || null,
          author_3:  authors[2] || null,
          author_4:  authors[3] || null,
          author_5:  authors[4] || null,
          publisher: cols[idx("publisher")]      || null,
          year:      cols[idx("year_published")] || null,
          category:  cols[idx("category_name")] || null,
        };
      }).filter((r) => r.title !== "");

      self.postMessage({ type: 'batch', batch, progress: i / rows.length });
    }

    self.postMessage({ type: 'done', total: rows.length });
  } catch (error) {
    if (error instanceof Error) {
      self.postMessage({ type: 'error', error: error.message });
    } else {
      self.postMessage({ type: 'error', error: 'An unknown error occurred' });
    }
  }
};
