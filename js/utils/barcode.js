/**
 * barcode.js - Camera Barcode scanner with BarcodeDetector API & metadata fetching
 * from Open Library and Google Books API
 */

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
  }

  async isSupported() {
    return 'BarcodeDetector' in window;
  }

  async start() {
    try {
      if ('BarcodeDetector' in window) {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        if (supported.includes('ean_13') || supported.includes('ean_8')) {
          this.detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
          });
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

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA && this.detector) {
      try {
        const barcodes = await this.detector.detect(this.video);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          const now = Date.now();
          // Debounce same code within 3 seconds
          if (code !== this.lastDetectedCode || now - this.lastDetectTime > 3000) {
            this.lastDetectedCode = code;
            this.lastDetectTime = now;
            this.onDetected(code);
          }
        }
      } catch (e) {
        // detection frame error
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.scanLoop());
  }
}

/**
 * Fetch book metadata from Open Library and Google Books
 */
export async function fetchBookMetadataByISBN(isbn) {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '').trim();
  if (!cleanIsbn) throw new Error('Invalid ISBN');

  let result = {
    isbn: cleanIsbn,
    title: '',
    subtitle: '',
    authors: [],
    publisher: '',
    publicationYear: '',
    pageCount: null,
    category: '',
    coverImage: '',
    language: 'en',
    description: ''
  };

  // 1. Try Google Books API
  try {
    const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
    if (gbRes.ok) {
      const gbData = await gbRes.json();
      if (gbData.totalItems > 0 && gbData.items && gbData.items[0]) {
        const info = gbData.items[0].volumeInfo;
        result.title = info.title || '';
        result.subtitle = info.subtitle || '';
        result.authors = info.authors || [];
        result.publisher = info.publisher || '';
        result.publicationYear = (info.publishedDate || '').substring(0, 4);
        result.pageCount = info.pageCount || null;
        result.language = info.language || (isArabicText(result.title) ? 'ar' : 'en');
        result.description = info.description || '';
        
        if (info.categories && info.categories.length > 0) {
          result.category = info.categories[0];
        }

        if (info.imageLinks) {
          let cover = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '';
          if (cover.startsWith('http://')) {
            cover = cover.replace('http://', 'https://');
          }
          result.coverImage = cover;
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('Google Books API lookup failed, falling back to Open Library:', err);
  }

  // 2. Fallback to Open Library API
  try {
    const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
    if (olRes.ok) {
      const olData = await olRes.json();
      const key = `ISBN:${cleanIsbn}`;
      if (olData[key]) {
        const info = olData[key];
        result.title = info.title || '';
        result.subtitle = info.subtitle || '';
        result.authors = (info.authors || []).map(a => a.name);
        result.publisher = (info.publishers || []).map(p => p.name).join(', ');
        result.publicationYear = (info.publish_date || '').replace(/[^0-9]/g, '').slice(-4);
        result.pageCount = info.number_of_pages || null;
        result.language = isArabicText(result.title) ? 'ar' : 'en';

        if (info.cover) {
          result.coverImage = info.cover.large || info.cover.medium || info.cover.small || '';
        }
        return result;
      }
    }
  } catch (err) {
    console.warn('Open Library API lookup failed:', err);
  }

  if (!result.title) {
    throw new Error('No metadata found for this ISBN');
  }

  return result;
}

/**
 * Search books by query (Title / Author / Keyword)
 */
export async function searchBooksOnline(query) {
  if (!query) return [];
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.items) return [];

    return data.items.map(item => {
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
        language: info.language || (isArabicText(info.title) ? 'ar' : 'en'),
        isbn,
        coverImage: cover,
        category: (info.categories && info.categories[0]) || ''
      };
    });
  } catch (err) {
    console.error('Online search error:', err);
    return [];
  }
}

function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(text || '');
}
