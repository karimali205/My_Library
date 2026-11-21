/**
 * db.js - IndexedDB storage engine with migrations, snapshots, and safety
 */

import { sanitizeBook } from './models.js';
import { realPhotoBooks } from './data/library-books.js';

const DB_NAME = 'MyLibraryDB';
const DB_VERSION = 1;

let dbInstance = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 1. Books store
      if (!db.objectStoreNames.contains('books')) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' });
        bookStore.createIndex('title', 'title', { unique: false });
        bookStore.createIndex('isbn', 'isbn', { unique: false });
        bookStore.createIndex('status', 'status', { unique: false });
        bookStore.createIndex('category', 'category', { unique: false });
        bookStore.createIndex('deletedAt', 'deletedAt', { unique: false });
        bookStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 2. Wishlist store
      if (!db.objectStoreNames.contains('wishlist')) {
        const wishStore = db.createObjectStore('wishlist', { keyPath: 'id' });
        wishStore.createIndex('title', 'title', { unique: false });
        wishStore.createIndex('priority', 'priority', { unique: false });
      }

      // 3. Snapshots store (for internal rollback)
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'id' });
      }

      // 4. Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // 5. Audits store
      if (!db.objectStoreNames.contains('inventory_audits')) {
        db.createObjectStore('inventory_audits', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Execute an IndexedDB transaction helper
 */
async function tx(storeName, mode, callback) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    try {
      result = callback(store);
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------- BOOK CRUD ---------------- //

export async function getAllBooks(includeDeleted = false) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('books', 'readonly');
    const store = transaction.objectStore('books');
    const request = store.getAll();

    request.onsuccess = () => {
      const all = (request.result || []).map(sanitizeBook);
      if (includeDeleted) {
        resolve(all);
      } else {
        resolve(all.filter(b => !b.deletedAt));
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getBookById(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('books', 'readonly');
    const store = transaction.objectStore('books');
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result) {
        resolve(sanitizeBook(request.result));
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveBook(book) {
  const sanitized = sanitizeBook(book);
  sanitized.updatedAt = new Date().toISOString();

  await tx('books', 'readwrite', (store) => {
    store.put(sanitized);
  });
  return sanitized;
}

export async function saveBooksBatch(books) {
  const db = await getDB();
  const sanitizedList = books.map(b => {
    const s = sanitizeBook(b);
    s.updatedAt = new Date().toISOString();
    return s;
  });

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('books', 'readwrite');
    const store = transaction.objectStore('books');

    sanitizedList.forEach(book => store.put(book));

    transaction.oncomplete = () => resolve(sanitizedList);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Soft delete book to trash
 */
export async function deleteBook(id) {
  const book = await getBookById(id);
  if (!book) return false;
  book.deletedAt = new Date().toISOString();
  await saveBook(book);
  return true;
}

/**
 * Restore book from trash
 */
export async function restoreBook(id) {
  const book = await getBookById(id);
  if (!book) return false;
  book.deletedAt = null;
  await saveBook(book);
  return true;
}

/**
 * Permanent hard delete
 */
export async function permanentlyDeleteBook(id) {
  await tx('books', 'readwrite', (store) => {
    store.delete(id);
  });
  return true;
}

/**
 * Get books currently in trash
 */
export async function getTrashBooks() {
  const all = await getAllBooks(true);
  return all.filter(b => !!b.deletedAt);
}

/**
 * Empty trash
 */
export async function emptyTrash() {
  const trash = await getTrashBooks();
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('books', 'readwrite');
    const store = transaction.objectStore('books');
    trash.forEach(b => store.delete(b.id));
    transaction.oncomplete = () => resolve(trash.length);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Auto purge trash older than 30 days
 */
export async function autoPurgeTrash() {
  const trash = await getTrashBooks();
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const toDelete = trash.filter(b => {
    const delTime = new Date(b.deletedAt).getTime();
    return now - delTime > thirtyDaysMs;
  });

  if (toDelete.length > 0) {
    const db = await getDB();
    const transaction = db.transaction('books', 'readwrite');
    const store = transaction.objectStore('books');
    toDelete.forEach(b => store.delete(b.id));
  }
}

// ---------------- WISHLIST ---------------- //

export async function getWishlist() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('wishlist', 'readonly');
    const store = transaction.objectStore('wishlist');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWishlistItem(item) {
  if (!item.id) {
    item.id = 'wish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }
  item.updatedAt = new Date().toISOString();
  await tx('wishlist', 'readwrite', (store) => {
    store.put(item);
  });
  return item;
}

export async function deleteWishlistItem(id) {
  await tx('wishlist', 'readwrite', (store) => {
    store.delete(id);
  });
  return true;
}

// ---------------- SNAPSHOTS (ROLLBACK) ---------------- //

export async function createSnapshot(label = 'Manual / System') {
  const books = await getAllBooks(true);
  const settings = await getAllSettings();
  const snapshot = {
    id: 'snap_' + Date.now(),
    date: new Date().toISOString(),
    label,
    bookCount: books.length,
    data: { books, settings }
  };

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshots', 'readwrite');
    const store = transaction.objectStore('snapshots');
    
    // Get all snapshots, limit to 5
    const getReq = store.getAll();
    getReq.onsuccess = () => {
      const all = getReq.result || [];
      // Sort oldest first
      all.sort((a, b) => new Date(a.date) - new Date(b.date));
      while (all.length >= 5) {
        const oldest = all.shift();
        store.delete(oldest.id);
      }
      store.put(snapshot);
    };

    transaction.oncomplete = () => resolve(snapshot);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getSnapshots() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('snapshots', 'readonly');
    const store = transaction.objectStore('snapshots');
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      all.sort((a, b) => new Date(b.date) - new Date(a.date));
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function restoreSnapshot(snapshotId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['snapshots', 'books', 'settings'], 'readwrite');
    const snapStore = transaction.objectStore('snapshots');
    const bookStore = transaction.objectStore('books');
    const setStore = transaction.objectStore('settings');

    const getReq = snapStore.get(snapshotId);
    getReq.onsuccess = () => {
      const snapshot = getReq.result;
      if (!snapshot) {
        reject(new Error('Snapshot not found'));
        return;
      }

      // Clear books & restore
      bookStore.clear();
      (snapshot.data.books || []).forEach(b => bookStore.put(b));

      // Restore settings
      if (snapshot.data.settings) {
        setStore.clear();
        Object.entries(snapshot.data.settings).forEach(([k, v]) => {
          setStore.put({ key: k, value: v });
        });
      }
    };

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
}

// ---------------- SETTINGS ---------------- //

export async function getSetting(key, defaultValue = null) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const req = store.get(key);
    req.onsuccess = () => {
      if (req.result && req.result.value !== undefined) {
        resolve(req.result.value);
      } else {
        resolve(defaultValue);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setSetting(key, value) {
  await tx('settings', 'readwrite', (store) => {
    store.put({ key, value });
  });
  return value;
}

export async function getAllSettings() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const req = store.getAll();
    req.onsuccess = () => {
      const map = {};
      (req.result || []).forEach(item => {
        map[item.key] = item.value;
      });
      resolve(map);
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------------- WIPE & SAMPLE DATA ---------------- //

export async function removeSampleBooks() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('books', 'readwrite');
    const store = transaction.objectStore('books');
    const req = store.getAll();
    let count = 0;

    req.onsuccess = () => {
      const books = req.result || [];
      books.forEach(b => {
        if (b.isSample) {
          store.delete(b.id);
          count++;
        }
      });
    };

    transaction.oncomplete = () => resolve(count);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function wipeAllData() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ['books', 'wishlist', 'snapshots', 'settings', 'inventory_audits'],
      'readwrite'
    );
    transaction.objectStore('books').clear();
    transaction.objectStore('wishlist').clear();
    transaction.objectStore('snapshots').clear();
    transaction.objectStore('settings').clear();
    transaction.objectStore('inventory_audits').clear();

    transaction.oncomplete = () => {
      localStorage.clear();
      resolve(true);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

// ---------------- PERSISTENT STORAGE ---------------- //

export async function checkStoragePersistence() {
  if (navigator.storage && navigator.storage.persisted) {
    return await navigator.storage.persisted();
  }
  return false;
}

export async function requestStoragePersistence() {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  }
  return false;
}

export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usedMb = (estimate.usage || 0) / (1024 * 1024);
    return `${usedMb.toFixed(2)} MB`;
  }
  return 'Unknown';
}

// ---------------- 20 CURATED SAMPLE BOOKS ---------------- //

export function getSampleBooks() {
  return realPhotoBooks;
}

/**
 * Seed initial sample books or upgrade from old dummy samples to user's real library
 */
export async function seedSampleBooksIfEmpty() {
  const books = await getAllBooks(true);
  const realSamples = getSampleBooks();

  if (books.length === 0) {
    await saveBooksBatch(realSamples);
    await createSnapshot('Initial Real Library from Photos');
    return realSamples.length;
  }

  // Detect if current database has old synthetic dummy books (e.g. sample_1, sample_2, etc.)
  const hasOldDummySamples = books.some(b => b.id.startsWith('sample_') && !b.id.startsWith('sample_akt_'));
  const hasRealLibrary = books.some(b => b.id.startsWith('lib_'));

  if (hasOldDummySamples || !hasRealLibrary) {
    // Preserve any custom user-added books (non-sample)
    const userCustomBooks = books.filter(b => !b.isSample && !b.id.startsWith('sample_'));

    // Clear old sample store
    const db = await getDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('books', 'readwrite');
      const store = transaction.objectStore('books');
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    const combined = [...realSamples, ...userCustomBooks];
    await saveBooksBatch(combined);
    await createSnapshot('Upgraded Library to Real Photo Books');
    return combined.length;
  }

  // Check if there are new books in realPhotoBooks (e.g. from Part 2 photos) not yet in IndexedDB
  const existingIds = new Set(books.map(b => b.id));
  const newBooksToSeed = realSamples.filter(b => !existingIds.has(b.id));
  if (newBooksToSeed.length > 0) {
    await saveBooksBatch(newBooksToSeed);
    await createSnapshot(`Imported ${newBooksToSeed.length} new books from Part 2 photos`);
  }

  // Update missing covers for existing books if new verified covers are present in realPhotoBooks
  const bookMap = new Map(books.map(b => [b.id, b]));
  const booksToUpdateCovers = [];
  realSamples.forEach(sample => {
    const existing = bookMap.get(sample.id);
    if (existing && !existing.coverImage && sample.coverImage) {
      existing.coverImage = sample.coverImage;
      booksToUpdateCovers.push(existing);
    }
  });
  if (booksToUpdateCovers.length > 0) {
    await saveBooksBatch(booksToUpdateCovers);
    console.log(`Updated covers for ${booksToUpdateCovers.length} books in IndexedDB.`);
  }

  return (newBooksToSeed.length || booksToUpdateCovers.length);
}
