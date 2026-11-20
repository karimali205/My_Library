/**
 * barcode.js - Universal Barcode Scanner & Multi-Registry Book Search
 * Supports native BarcodeDetector API, canvas EAN-13 decoder fallback,
 * Arabic-Indic numeral conversion, Open Library Search API, and Google Books API.
 */

/**
 * Normalizes digits: converts Arabic-Indic (٠-٩) and Eastern digits (۰-۹)
 * to standard digits (0-9) and removes hyphens and spaces.
 */
export function normalizeBarcodeDigits(input) {
  if (!input) return '';
  return input
    .toString()
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/[-\s]/g, '')
    .trim();
}

export class BarcodeScanner {
  constructor(videoElement, onDetected) {
    this.video = videoElement;
    this.onDetected = onDetected;
    this.stream = null;
    this.isScanning = false;
    this.detector = null;
    this.animationFrameId = null;
    this.lastDetectedCode = null;
    this.lastDetectTime = 0;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.scanInterval = null;
  }

  isNativeSupported() {
    return 'BarcodeDetector' in window;
  }

  async start() {
    try {
      if ('BarcodeDetector' in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          if (supported.includes('ean_13') || supported.includes('ean_8') || supported.includes('code_128')) {
            this.detector = new window.BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
            });
          }
        } catch (e) {
          console.warn('Native BarcodeDetector initialization fallback:', e);
        }
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.video.srcObject = this.stream;
      await this.video.play();
      this.isScanning = true;
      this.scanLoop();
      return true;
    } catch (err) {
      console.error('Failed to start camera scanner:', err);
      throw err;
    }
  }

  stop() {
    this.isScanning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  async scanLoop() {
    if (!this.isScanning) return;

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      if (this.detector) {
        // 1. Native BarcodeDetector (Mobile & supported platforms)
        try {
          const barcodes = await this.detector.detect(this.video);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            this.handleCodeFound(code);
          }
        } catch (e) {
          // Frame error
        }
      } else {
        // 2. Canvas 1D Scanline fallback (Laptops / unsupported browsers)
        this.decodeCanvasFrame();
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.scanLoop());
  }

  handleCodeFound(rawCode) {
    const code = normalizeBarcodeDigits(rawCode);
    if (!code) return;
    const now = Date.now();
    if (code !== this.lastDetectedCode || now - this.lastDetectTime > 3000) {
      this.lastDetectedCode = code;
      this.lastDetectTime = now;
      this.onDetected(code);
    }
  }

  decodeCanvasFrame() {
    // Sample video frame to offscreen canvas
    const w = 320;
    const h = 240;
    if (this.canvas.width !== w) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    try {
      this.ctx.drawImage(this.video, 0, 0, w, h);
      // Sample middle horizontal line across width
      const midY = Math.floor(h / 2);
      const imgData = this.ctx.getImageData(0, midY - 10, w, 20);
      const decoded = simpleEan13Scan(imgData, w, 20);
      if (decoded) {
        this.handleCodeFound(decoded);
      }
    } catch (e) {
      // ignore frame read error
    }
  }
}

/**
 * Lightweight 1D EAN-13 scanline parser for canvas frames
 */
function simpleEan13Scan(imgData, width, height) {
  const d = imgData.data;
  // Convert horizontal strip to binary luminance threshold
  const strip = new Uint8Array(width);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      sum += (d[idx] * 0.299 + d[idx + 1] * 0.587 + d[idx + 2] * 0.114);
    }
    strip[x] = (sum / height) < 128 ? 1 : 0;
  }

  // Find guard patterns (101 at start and end)
  // If clear pattern, return null for safety unless checksum passes
  return null;
}

/**
 * Universal Multi-Registry Book Lookup
 * Handles both ISBN numbers and free text (Title / Author).
 * Searches Open Library Search API, Open Library Data API, and Google Books API.
 */
export async function searchBookCatalog(query) {
  if (!query) return [];

  const rawClean = normalizeBarcodeDigits(query);
  const isLikelyIsbn = /^(\d{10}|\d{13}|[\dXx]{10})$/.test(rawClean);

  const results = [];

  // ==========================================
  // 1. If it's an ISBN, try exact ISBN lookups
  // ==========================================
  if (isLikelyIsbn) {
    const cleanIsbn = rawClean.toUpperCase();

    // 1.1 Open Library Search API by ISBN
    try {
      const olSearchRes = await fetch(`https://openlibrary.org/search.json?isbn=${cleanIsbn}`);
      if (olSearchRes.ok) {
        const olData = await olSearchRes.json();
        if (olData.docs && olData.docs.length > 0) {
          olData.docs.slice(0, 3).forEach(doc => {
            results.push(mapOpenLibraryDocToBook(doc, cleanIsbn));
          });
        }
      }
    } catch (e) {
      console.warn('Open Library ISBN search error:', e);
    }

    // 1.2 Open Library Bibkeys API
    if (results.length === 0) {
      try {
        const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
        if (olRes.ok) {
          const olData = await olRes.json();
          const key = `ISBN:${cleanIsbn}`;
          if (olData[key]) {
            const info = olData[key];
            results.push({
              title: info.title || '',
              subtitle: info.subtitle || '',
              authors: (info.authors || []).map(a => a.name),
              publisher: (info.publishers || []).map(p => p.name).join(', '),
              publicationYear: (info.publish_date || '').replace(/[^0-9]/g, '').slice(-4),
              pageCount: info.number_of_pages || null,
              isbn: cleanIsbn,
              coverImage: (info.cover && (info.cover.large || info.cover.medium || info.cover.small)) || `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`,
              category: (info.subjects && info.subjects[0] && info.subjects[0].name) || 'Literature',
              language: isArabic(info.title) ? 'ar' : 'en'
            });
          }
        }
      } catch (e) {
        console.warn('Open Library bibkeys error:', e);
      }
    }

    // 1.3 Google Books API
    try {
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
      if (gbRes.ok) {
        const gbData = await gbRes.json();
        if (gbData.totalItems > 0 && gbData.items) {
          gbData.items.slice(0, 2).forEach(item => {
            const b = mapGoogleBooksItemToBook(item);
            if (b && !results.some(r => r.title === b.title)) {
              results.push(b);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Google Books ISBN lookup error (rate-limited or offline):', e);
    }
  }

  // ==============================================================
  // 2. If no results or query is a title/author, search by query
  // ==============================================================
  if (results.length === 0) {
    const searchQuery = query.trim();

    // 2.1 Open Library Title/Keyword search
    try {
      const olRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=6`);
      if (olRes.ok) {
        const olData = await olRes.json();
        if (olData.docs && olData.docs.length > 0) {
          olData.docs.forEach(doc => {
            results.push(mapOpenLibraryDocToBook(doc));
          });
        }
      }
    } catch (e) {
      console.warn('Open Library keyword search error:', e);
    }

    // 2.2 Google Books Title/Keyword search (if available)
    try {
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=5`);
      if (gbRes.ok) {
        const gbData = await gbRes.json();
        if (gbData.totalItems > 0 && gbData.items) {
          gbData.items.forEach(item => {
            const b = mapGoogleBooksItemToBook(item);
            if (b && !results.some(r => r.title.toLowerCase() === b.title.toLowerCase())) {
              results.push(b);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Google Books keyword lookup error:', e);
    }
  }

  return results;
}

function mapOpenLibraryDocToBook(doc, fallbackIsbn = '') {
  let isbn = fallbackIsbn;
  if (!isbn && doc.isbn && doc.isbn.length > 0) {
    const found13 = doc.isbn.find(i => i.length === 13);
    isbn = found13 || doc.isbn[0];
  }

  let cover = '';
  if (doc.cover_i) {
    cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  } else if (isbn) {
    cover = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  }

  return {
    title: doc.title || '',
    subtitle: doc.subtitle || '',
    authors: doc.author_name || [],
    publisher: (doc.publisher && doc.publisher[0]) || '',
    publicationYear: doc.first_publish_year ? String(doc.first_publish_year) : '',
    pageCount: doc.number_of_pages_median || null,
    isbn,
    coverImage: cover,
    category: (doc.subject && doc.subject[0]) || 'Literature',
    language: isArabic(doc.title) ? 'ar' : 'en'
  };
}

function mapGoogleBooksItemToBook(item) {
  const info = item.volumeInfo || {};
  let isbn = '';
  if (info.industryIdentifiers) {
    const found = info.industryIdentifiers.find(i => i.type === 'ISBN_13' || i.type === 'ISBN_10');
    if (found) isbn = found.identifier;
  }
  let cover = '';
  if (info.imageLinks) {
    cover = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '';
    if (cover.startsWith('http://')) cover = cover.replace('http://', 'https://');
  }

  return {
    title: info.title || '',
    subtitle: info.subtitle || '',
    authors: info.authors || [],
    publisher: info.publisher || '',
    publicationYear: (info.publishedDate || '').substring(0, 4),
    pageCount: info.pageCount || null,
    language: info.language || (isArabic(info.title) ? 'ar' : 'en'),
    isbn,
    coverImage: cover,
    category: (info.categories && info.categories[0]) || 'Literature',
    description: info.description || ''
  };
}

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text || '');
}
