/**
 * cover-fetcher.js - Automatic Online Book Cover Search & Offline Caching Engine
 * Fetches high-resolution book covers from Google Books and OpenLibrary APIs,
 * compresses them, and stores them directly into IndexedDB as offline data URLs.
 */

async function compressBlobToDataUrl(blob, maxWidth = 500) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width || 400;
        let height = img.naturalHeight || img.height || 600;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (e) {
        URL.revokeObjectURL(url);
        // Fallback to basic file reader
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    };
    img.src = url;
  });
}

/**
 * Searches online for a book cover given title, author, and optional ISBN.
 * Returns a compressed base64 data URL ready for offline storage, or null if not found.
 */
export async function searchBookCover(title, author = '', isbn = '') {
  if (!navigator.onLine) {
    throw new Error('لا يوجد اتصال بالإنترنت للبحث عن الأغلفة');
  }

  let imageUrl = null;

  // 1. Try Google Books API with ISBN if available, or Title + Author
  try {
    let query = '';
    const cleanIsbn = (isbn || '').replace(/[^0-9X]/gi, '');
    if (cleanIsbn.length >= 10) {
      query = `isbn:${cleanIsbn}`;
    } else {
      const cleanTitle = (title || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
      query = `intitle:${cleanTitle}`;
      if (author) {
        const cleanAuthor = author.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
        query += `+inauthor:${cleanAuthor}`;
      }
    }

    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3`);
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const links = item.volumeInfo?.imageLinks;
          if (links) {
            imageUrl = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
            if (imageUrl) {
              // Ensure HTTPS and request higher resolution if possible
              imageUrl = imageUrl.replace(/^http:\/\//i, 'https://').replace(/&edge=curl/i, '');
              break;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Google Books Cover search warning:', err);
  }

  // 2. Fallback to Open Library Covers if ISBN exists and Google didn't find one
  if (!imageUrl && isbn) {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    if (cleanIsbn) {
      const openLibUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`;
      try {
        const check = await fetch(openLibUrl, { method: 'HEAD' });
        if (check.ok) {
          imageUrl = openLibUrl;
        }
      } catch (e) {
        // Ignore CORS head errors
      }
    }
  }

  if (!imageUrl) {
    return null;
  }

  // 3. Download the cover image and convert to local dataURL for 100% offline persistence
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const blob = await response.blob();

    if (!blob.type.startsWith('image/')) {
      return null;
    }

    const compressedDataUrl = await compressBlobToDataUrl(blob, 500);

    return {
      sourceUrl: imageUrl,
      dataUrl: compressedDataUrl
    };
  } catch (err) {
    console.warn('Could not cache cover offline:', err);
    return {
      sourceUrl: imageUrl,
      dataUrl: imageUrl
    };
  }
}
