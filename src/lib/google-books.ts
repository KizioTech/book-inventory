// lib/google-books.ts

interface BookMetadata {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: string;
}

// Clean ISBN by removing non-numeric characters
function cleanIsbn(isbn: string): string {
  // Remove all non-numeric characters and convert to string
  const cleaned = isbn.replace(/\D/g, '');
  
  // Handle ISBN-10 (10 digits) and ISBN-13 (13 digits)
  if (cleaned.length === 10 || cleaned.length === 13) {
    return cleaned;
  }
  
  // If we have more than 13 digits, try to extract the ISBN part
  // (some barcodes have extra prefix numbers)
  if (cleaned.length > 13) {
    // Try to find a valid ISBN-13 pattern (usually starts with 978 or 979)
    const match = cleaned.match(/(978|979)\d{10}/);
    if (match) return match[0];
    
    // Try ISBN-10 pattern
    const match10 = cleaned.match(/\d{10}/);
    if (match10) return match10[0];
  }
  
  return cleaned;
}

// Format ISBN for API (Google Books expects ISBN: prefix for ISBN searches)
function formatIsbnForApi(isbn: string): string {
  const cleaned = cleanIsbn(isbn);
  if (cleaned.length === 13) {
    return `ISBN:${cleaned}`; // ISBN-13
  }
  if (cleaned.length === 10) {
    return `ISBN:${cleaned}`; // ISBN-10
  }
  return cleaned; // Fallback to search as text
}

export async function lookupIsbn(isbn: string): Promise<BookMetadata | null> {
  if (!isbn || isbn.trim() === '') {
    return null;
  }

  const cleanedIsbn = cleanIsbn(isbn);
  
  if (cleanedIsbn.length === 0) {
    console.warn('No valid ISBN found after cleaning');
    return null;
  }

  // Try multiple search strategies
  const searchStrategies = [
    // Strategy 1: Direct ISBN search (most accurate)
    async () => {
      const isbnParam = formatIsbnForApi(cleanedIsbn);
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(isbnParam)}&maxResults=1`;
      return await fetchGoogleBooks(url);
    },
    // Strategy 2: Search by raw ISBN (if prefix method fails)
    async () => {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(cleanedIsbn)}&maxResults=1`;
      return await fetchGoogleBooks(url);
    },
    // Strategy 3: Search by ISBN with "isbn" field (Google's alternative format)
    async () => {
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(cleanedIsbn)}&maxResults=1`;
      return await fetchGoogleBooks(url);
    }
  ];

  // Try each strategy in order until one works
  for (let i = 0; i < searchStrategies.length; i++) {
    try {
      const result = await searchStrategies[i]();
      if (result) {
        console.log(`Successfully found metadata with strategy ${i + 1}`);
        return result;
      }
    } catch (error) {
      console.warn(`Strategy ${i + 1} failed:`, error);
      continue;
    }
  }

  // If no metadata found, return null
  console.warn(`No metadata found for ISBN: ${cleanedIsbn}`);
  return null;
}

async function fetchGoogleBooks(url: string): Promise<BookMetadata | null> {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Google Books API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const book = data.items[0].volumeInfo;
    
    // Extract publication year from date string
    let year = '';
    if (book.publishedDate) {
      // Handle different date formats (YYYY, YYYY-MM, YYYY-MM-DD)
      const yearMatch = book.publishedDate.match(/^\d{4}/);
      year = yearMatch ? yearMatch[0] : '';
    }

    // Get the ISBN from the book's industry identifiers
    let foundIsbn = '';
    if (book.industryIdentifiers) {
      const isbn13 = book.industryIdentifiers.find(
        (id: any) => id.type === 'ISBN_13'
      );
      const isbn10 = book.industryIdentifiers.find(
        (id: any) => id.type === 'ISBN_10'
      );
      foundIsbn = isbn13?.identifier || isbn10?.identifier || '';
    }

    return {
      isbn: foundIsbn,
      title: book.title || '',
      author: book.authors ? book.authors.join(', ') : '',
      publisher: book.publisher || '',
      year: year,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Google Books API request timed out');
    } else {
      console.error('Error fetching from Google Books API:', error);
    }
    return null;
  }
}

// Optional: Add a function to search by title/author when ISBN lookup fails
export async function searchBooks(query: string): Promise<Array<BookMetadata & { id: string }>> {
  if (!query || query.trim() === '') {
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (!data.items) {
      return [];
    }

    return data.items.map((item: any) => {
      const book = item.volumeInfo;
      let year = '';
      if (book.publishedDate) {
        const yearMatch = book.publishedDate.match(/^\d{4}/);
        year = yearMatch ? yearMatch[0] : '';
      }

      let isbn = '';
      if (book.industryIdentifiers) {
        const isbn13 = book.industryIdentifiers.find(
          (id: any) => id.type === 'ISBN_13'
        );
        const isbn10 = book.industryIdentifiers.find(
          (id: any) => id.type === 'ISBN_10'
        );
        isbn = isbn13?.identifier || isbn10?.identifier || '';
      }

      return {
        id: item.id,
        isbn: isbn,
        title: book.title || '',
        author: book.authors ? book.authors.join(', ') : '',
        publisher: book.publisher || '',
        year: year,
      };
    });
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
}
