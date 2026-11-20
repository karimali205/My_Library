/**
 * db.js - IndexedDB storage engine with migrations, snapshots, and safety
 */

import { sanitizeBook } from './models.js';

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
  return [
    // 5 MASTERPIECES BY DR. AHMED KHALED TAWFIK (أحمد خالد توفيق)
    {
      id: 'sample_akt_1',
      title: 'يوتوبيا',
      subtitle: 'رواية ديستوبية عن صراع الطبقات ومصير المجتمع',
      authors: ['أحمد خالد توفيق'],
      publisher: 'دار الشروق',
      publicationYear: '2008',
      edition: '15',
      isbn: '9789770928171',
      language: 'ar',
      pageCount: 192,
      category: 'literature',
      subcategory: 'ديستوبيا وخيال علمي اجتماعي',
      tags: ['رواية', 'ديستوبيا', 'أحمد خالد توفيق', 'مصر', 'خيال علمي'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الأدب العربي', shelf: 'رف 1' },
      physicalCondition: 'new',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 192,
      startDate: '2024-03-01',
      finishDate: '2024-03-05',
      isFavorite: true,
      rating: 5,
      review: 'من أعظم وأجرأ الروايات العربية الحديثة. رسم قاتم ومبهر لما قد تؤول إليه الفروق الطبقية في مصر المستقبلية.',
      quotes: [
        { id: 'qakt1', text: 'لقد انحدرنا إلى القاع، ولن نرتد منه أبداً ما دامت الدوافع قائمة.. إنهم يعيشون في يوتوبيا ونحن نعيش في المنفى.', page: 48 },
        { id: 'qakt2', text: 'الخوف هو العملة الوحيدة التي لا تنخفض قيمتها أبداً في هذا العالم.', page: 112 }
      ],
      purchasePrice: 12,
      currency: 'USD',
      purchaseDate: '2024-01-15',
      purchasePlace: 'مكتبة ديوان',
      series: { name: '', volume: '' },
      collections: ['روائع العراب', 'روايات ديستوبية'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_akt_2',
      title: 'شآبيب',
      subtitle: 'رواية خيالية عن مأساة العرب وتجمعهم في إفريقيا',
      authors: ['أحمد خالد توفيق'],
      publisher: 'دار الشروق',
      publicationYear: '2018',
      edition: '8',
      isbn: '9789770934981',
      language: 'ar',
      pageCount: 320,
      category: 'literature',
      subcategory: 'رواية ملحمية سياسية',
      tags: ['رواية', 'العراب', 'خيال سياسي', 'شآبيب'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الأدب العربي', shelf: 'رف 1' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 320,
      startDate: '2024-04-10',
      finishDate: '2024-04-20',
      isFavorite: true,
      rating: 5,
      review: 'آخر ما كتب العراب الراحل.. فكرة شديدة العمق والألم حول محاولة جمع شتات الشعوب العربية في مستوطنة واحدة.',
      quotes: [
        { id: 'qakt3', text: 'نحن أمة فرقتها الجغرافيا، وشتتها التاريخ، وجمعها سوء المصير.. لكن شآبيب الأمل تأتي دائماً بعد أحلك الليالي.', page: 75 }
      ],
      purchasePrice: 14,
      currency: 'USD',
      collections: ['روائع العراب'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_akt_3',
      title: 'خارج الصندوق',
      subtitle: 'مقالات في الفكر والحياة وأحوال المجتمع',
      authors: ['أحمد خالد توفيق'],
      publisher: 'كيان للنشر والتوزيع',
      publicationYear: '2016',
      edition: '4',
      isbn: '9789778200157',
      language: 'ar',
      pageCount: 224,
      category: 'philosophy',
      subcategory: 'مقالات ونقد ساخر',
      tags: ['مقالات', 'فكر', 'سخرية', 'أحمد خالد توفيق'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الفكر والمقالات', shelf: 'رف 2' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 224,
      startDate: '2024-06-01',
      finishDate: '2024-06-07',
      isFavorite: true,
      rating: 4.5,
      review: 'مجموعة مقالات ذكية تمزج بين السخرية والتحليل المجتمعي العميق بأسلوب د. أحمد خالد توفيق الفريد والصادق.',
      quotes: [
        { id: 'qakt4', text: 'الخروج من الصندوق ليس ترفاً ذهنياً، بل هو وسيلة النجاة الوحيدة في عالم تملؤه الصناديق المتشابهة.', page: 34 }
      ],
      purchasePrice: 10,
      currency: 'USD',
      collections: ['روائع العراب', 'مقالات'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_akt_4',
      title: 'عقل بلا جسد',
      subtitle: 'مجموعة قصصية مشوقة بين الخيال والغموض',
      authors: ['أحمد خالد توفيق'],
      publisher: 'سما للنشر والتوزيع',
      publicationYear: '2008',
      edition: '6',
      isbn: '9789776263055',
      language: 'ar',
      pageCount: 208,
      category: 'literature',
      subcategory: 'قصص قصيرة وخيال علمي',
      tags: ['قصص قصيرة', 'خيال علمي', 'غموض', 'العراب'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الأدب العربي', shelf: 'رف 2' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 208,
      startDate: '2024-07-12',
      finishDate: '2024-07-16',
      isFavorite: true,
      rating: 4.5,
      review: 'قصص فلسفية ونفسية تجعل القارئ يتأمل في ماهية الوعي الإنساني وحدود العقل والجسد.',
      quotes: [
        { id: 'qakt5', text: 'العقل عندما يتحرر من قيود الجسد قد يرى الحقيقة كاملة.. أو يفقد صوابه إلى الأبد.', page: 92 }
      ],
      purchasePrice: 9,
      currency: 'USD',
      collections: ['روائع العراب'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_akt_5',
      title: 'في ممر الفئران',
      subtitle: 'رواية فلسفية استعارية مستوحاة من أسطورة النور والظلام',
      authors: ['أحمد خالد توفيق'],
      publisher: 'دار الكرمة',
      publicationYear: '2016',
      edition: '9',
      isbn: '9789776467477',
      language: 'ar',
      pageCount: 380,
      category: 'literature',
      subcategory: 'ديستوبيا ورمزية فلسفية',
      tags: ['رواية', 'ديستوبيا', 'رمزية', 'أحمد خالد توفيق'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الأدب العربي', shelf: 'رف 1' },
      physicalCondition: 'new',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 380,
      startDate: '2024-08-01',
      finishDate: '2024-08-14',
      isFavorite: true,
      rating: 5,
      review: 'عالم سقط في ظلام دائم بعد كويكب حجب الشمس، وصار النور جريمة يُعاقب عليها الكهنة.. عمل ملحمي شديد الرمزية.',
      quotes: [
        { id: 'qakt6', text: 'هل تفضل أن ترى النور وتتعذب بالحقيقة، أم تظل في الظلام آمناً مع القطيع؟ في ممر الفئران لا يوجد خيار ثالث.', page: 120 }
      ],
      purchasePrice: 15,
      currency: 'USD',
      collections: ['روائع العراب', 'روايات ديستوبية'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_ar_1',
      title: 'مقدمة ابن خلدون',
      subtitle: 'كتاب العبر وديوان المبتدأ والخبر في معرفة أيام العرب والعجم والبربر',
      authors: ['عبد الرحمن بن خلدون'],
      publisher: 'دار إحياء التراث العربي',
      publicationYear: '2014',
      edition: '4',
      isbn: '9789953251234',
      language: 'ar',
      pageCount: 650,
      category: 'history',
      subcategory: 'فلسفة التاريخ وعلم الاجتماع',
      tags: ['تاريخ', 'علم اجتماع', 'أندلس', 'حضارة', 'تراث'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة التراث 1', shelf: 'رف 1' },
      physicalCondition: 'new',
      binding: 'hardcover',
      copies: 1,
      status: 'finished',
      currentPage: 650,
      startDate: '2025-01-10',
      finishDate: '2025-02-28',
      isFavorite: true,
      rating: 5,
      review: 'أعظم كتاب كُتب في فقه العمران وفهم طبائع الدول ونشوء الحضارات وسقوطها. عقلية ابن خلدون التحليلية سابقة لزمانها بقرون.',
      quotes: [
        { id: 'q1', text: 'إن التاريخ في ظاهره لا يزيد عن الإخبار، ولكن في باطنه نظر وتحقيق، وتعليل للكائنات ومبادئها دقيق.', page: 12 },
        { id: 'q2', text: 'الظلم مؤذن بخراب العمران.', page: 288 }
      ],
      purchasePrice: 28,
      currency: 'USD',
      purchaseDate: '2024-05-12',
      purchasePlace: 'معرض القاهرة الدولي للكتاب',
      series: { name: '', volume: '' },
      collections: ['نفائس التراث', 'كتب الفكر'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_ar_2',
      title: 'بين القصرين',
      subtitle: 'الجزء الأول من الثلاثية الشهيرة',
      authors: ['نجيب محفوظ'],
      publisher: 'دار الشروق',
      publicationYear: '2018',
      edition: '12',
      isbn: '9789770921004',
      language: 'ar',
      pageCount: 560,
      category: 'literature',
      subcategory: 'رواية اجتماعية واقعية',
      tags: ['رواية', 'نوبل', 'مصر', 'ثلاثية', 'كلاسيكيات'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الأدب العربي', shelf: 'رف 2' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 560,
      startDate: '2025-03-01',
      finishDate: '2025-03-20',
      isFavorite: true,
      rating: 5,
      review: 'تصوير عبقري للبيت القاهري وتحولات المجتمع المصري في مطلع القرن العشرين. شخصية سي السيد وأمينة وفهمي محفورة في الذاكرة.',
      quotes: [
        { id: 'q3', text: 'الخوف لا يمنع من الموت، ولكنه يمنع من الحياة.', page: 215 }
      ],
      purchasePrice: 15,
      currency: 'USD',
      purchaseDate: '2023-11-04',
      purchasePlace: 'مكتبة ديوان',
      series: { name: 'الثلاثية', volume: '1' },
      collections: ['أدب نوبل', 'روائع الرواية'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_ar_3',
      title: 'قصر الشوق',
      subtitle: 'الجزء الثاني من الثلاثية الشهيرة',
      authors: ['نجيب محفوظ'],
      publisher: 'دار الشروق',
      publicationYear: '2018',
      edition: '11',
      isbn: '9789770921011',
      language: 'ar',
      pageCount: 510,
      category: 'literature',
      subcategory: 'رواية اجتماعية واقعية',
      tags: ['رواية', 'نوبل', 'ثلاثية'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الأدب العربي', shelf: 'رف 2' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'reading',
      currentPage: 245,
      startDate: '2026-04-01',
      finishDate: '',
      isFavorite: true,
      rating: 4.5,
      review: 'تطور جيل كمال عبد الجواد وتساؤلاته الوجودية العميقة.',
      quotes: [],
      purchasePrice: 15,
      currency: 'USD',
      series: { name: 'الثلاثية', volume: '2' },
      collections: ['أدب نوبل'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_ar_4',
      title: 'موسم الهجرة إلى الشمال',
      subtitle: '',
      authors: ['الطيب صالح'],
      publisher: 'دار العين',
      publicationYear: '2020',
      edition: '9',
      isbn: '9789774903332',
      language: 'ar',
      pageCount: 180,
      category: 'literature',
      subcategory: 'رواية عربية معاصرة',
      tags: ['السودان', 'الشرق والغرب', 'كلاسيكيات', 'رواية'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الأدب العربي', shelf: 'رف 1' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 180,
      isFavorite: true,
      rating: 5,
      review: 'إحدى أعظم مائة رواية في التاريخ الإنساني. لقاء الشرق والغرب في صراع وجودي عميق.',
      quotes: [
        { id: 'q4', text: 'إنني أريد أن آخذ حقي من الحياة عنوة. أريد أن أعطي بسخاء، أريد أن يفيض الحب من قلبي فينبع ويثمر.', page: 73 }
      ],
      purchasePrice: 10,
      currency: 'USD',
      series: { name: '', volume: '' },
      collections: ['روائع الرواية'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_ar_5',
      title: 'ساق البامبو',
      subtitle: '',
      authors: ['سعود السنعوسي'],
      publisher: 'الدار العربية للعلوم ناشرون',
      publicationYear: '2013',
      edition: '15',
      isbn: '9786140105492',
      language: 'ar',
      pageCount: 396,
      category: 'literature',
      subcategory: 'رواية خليجية / بوكر',
      tags: ['بوكر', 'الهوية', 'الكويت', 'الفلبين'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الأدب العربي', shelf: 'رف 3' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 396,
      rating: 4.5,
      review: 'رواية إنسانية مؤثرة جداً عن البحث عن الهوية والوطن.',
      quotes: [
        { id: 'q5', text: 'كل شيء يحدث لسبب.. وحدها الأوطان حين تتركنا، تتركنا دون أسباب مقنعة.', page: 112 }
      ],
      purchasePrice: 14,
      currency: 'USD',
      collections: ['روايات البوكر'],
      loan: {
        isLoaned: true,
        borrower: 'أحمد الفاروقي',
        loanDate: '2026-05-01',
        expectedReturn: '2026-05-20',
        notes: 'مستعارة للقراءة خلال إجازة الأسبوع'
      },
      isSample: true
    },
    {
      id: 'sample_ar_6',
      title: 'تهافت الفلاسفة',
      subtitle: 'تحقيق سليمان دنيا',
      authors: ['أبو حامد الغزالي'],
      publisher: 'دار المعارف',
      publicationYear: '2011',
      edition: '6',
      isbn: '9789770274193',
      language: 'ar',
      pageCount: 340,
      category: 'philosophy',
      subcategory: 'علم الكلام والفلسفة الإسلامية',
      tags: ['فلسفة', 'الغزالي', 'منطق', 'تراث'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الفلسفة', shelf: 'رف 1' },
      physicalCondition: 'used',
      binding: 'hardcover',
      copies: 1,
      status: 'unread',
      currentPage: 0,
      rating: 4,
      review: 'حجة الإسلام الغزالي يناقش آراء أرسطو وابن سينا والفارابي بدقة منطقية مذهلة.',
      quotes: [],
      purchasePrice: 18,
      currency: 'USD',
      collections: ['نفائس التراث', 'كتب الفكر'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_ar_7',
      title: 'طوق الحمامة في الألفة والألاف',
      subtitle: 'دراسة في علم النفس الإنساني والعاطفي عند الأندلسيين',
      authors: ['ابن حزم الأندلسي'],
      publisher: 'دار المعارف',
      publicationYear: '2016',
      edition: '3',
      isbn: '9789770281146',
      language: 'ar',
      pageCount: 290,
      category: 'literature',
      subcategory: 'أدب أندلسي ورسائل',
      tags: ['الأندلس', 'أدب', 'شعر', 'ابن حزم'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة التراث 1', shelf: 'رف 2' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 290,
      isFavorite: true,
      rating: 5,
      review: 'تحليل نفسي وبلاغي رائع للمشاعر والعلاقات الإنسانية بأسلوب ابن حزم الفريد وشعره العذب.',
      quotes: [
        { id: 'q6', text: 'الحب أوله هزل وآخره جد، دقت معانيه لجلالتها عن أن توصف.', page: 18 }
      ],
      purchasePrice: 12,
      currency: 'USD',
      collections: ['نفائس التراث'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_ar_8',
      title: 'في الشعر الجاهلي',
      subtitle: 'دراسة نقدية تاريخية للشعر العربي القديم',
      authors: ['طه حسين'],
      publisher: 'دار المعارف',
      publicationYear: '2015',
      edition: '8',
      isbn: '9789770275824',
      language: 'ar',
      pageCount: 220,
      category: 'arts',
      subcategory: 'نقد أدبي ودراسات لغوية',
      tags: ['نقد', 'شعر جاهلي', 'طه حسين', 'تاريخ'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة الأدب العربي', shelf: 'رف 3' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 220,
      rating: 4,
      purchasePrice: 9,
      currency: 'USD',
      collections: ['كتب الفكر'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_ar_9',
      title: 'شخصية مصر: دراسة في عبقرية المكان',
      subtitle: 'المجلد الأول: شخصية مصر الطبيعية',
      authors: ['جمال حمدان'],
      publisher: 'دار الهلال',
      publicationYear: '2019',
      edition: '5',
      isbn: '9789770716501',
      language: 'ar',
      pageCount: 950,
      category: 'history',
      subcategory: 'جغرافيا تاريخية وفكر استراتيجي',
      tags: ['جغرافيا', 'مصر', 'استراتيجية', 'جمال حمدان'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة المجلدات الكبرى', shelf: 'رف 1' },
      physicalCondition: 'new',
      binding: 'hardcover',
      copies: 1,
      status: 'reading',
      currentPage: 310,
      startDate: '2026-03-15',
      isFavorite: true,
      rating: 5,
      series: { name: 'شخصية مصر', volume: '1' },
      quotes: [
        { id: 'q7', text: 'مصر فلتة جغرافية، تلتقي عندها قارات العالم القديم كحلقة وصل وتفاعل حضاري لا نظير له.', page: 45 }
      ],
      purchasePrice: 40,
      currency: 'USD',
      collections: ['الموسوعات', 'كتب الفكر'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_ar_10',
      title: 'ديوان المتنبي',
      subtitle: 'بشرح العكبري المسمى التبيان في شرح الديوان',
      authors: ['أبو الطيب المتنبي', 'أبو البقاء العكبري'],
      publisher: 'دار المعرفة',
      publicationYear: '2017',
      edition: '4',
      isbn: '9789953852119',
      language: 'ar',
      pageCount: 780,
      category: 'poetry',
      subcategory: 'شعر عربي كلاسيكي',
      tags: ['شعر', 'المتنبي', 'بلاغة', 'تراث'],
      location: { room: 'المكتبة الرئيسية', cabinet: 'خزانة التراث 1', shelf: 'رف 3' },
      physicalCondition: 'good',
      binding: 'hardcover',
      copies: 1,
      status: 'finished',
      currentPage: 780,
      isFavorite: true,
      rating: 5,
      quotes: [
        { id: 'q8', text: 'أعز مكان في الدنى سرج سابح.. وخير جليس في الزمان كتاب.', page: 204 }
      ],
      purchasePrice: 32,
      currency: 'USD',
      collections: ['نفائس التراث'],
      loan: { isLoaned: false },
      isSample: true
    },

    // 10 ENGLISH BOOKS
    {
      id: 'sample_en_1',
      title: 'To Kill a Mockingbird',
      subtitle: 'A Novel of Justice and Empathy',
      authors: ['Harper Lee'],
      publisher: 'HarperCollins',
      publicationYear: '2010',
      edition: '50th Anniversary',
      isbn: '9780061120084',
      language: 'en',
      pageCount: 336,
      category: 'literature',
      subcategory: 'Classic American Fiction',
      tags: ['classic', 'justice', 'pulitzer', 'fiction'],
      location: { room: 'Main Library', cabinet: 'Cabinet 2', shelf: 'Shelf 1' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 336,
      startDate: '2024-08-01',
      finishDate: '2024-08-15',
      isFavorite: true,
      rating: 5,
      review: 'A timeless exploration of morality, conscience, and empathy in the American South through the eyes of Scout Finch.',
      quotes: [
        { id: 'qe1', text: 'You never really understand a person until you consider things from his point of view... until you climb into his skin and walk around in it.', page: 39 }
      ],
      purchasePrice: 16,
      currency: 'USD',
      purchaseDate: '2024-02-10',
      purchasePlace: 'Kinokuniya BookStore',
      collections: ['Classics', 'Must Read'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_en_2',
      title: '1984',
      subtitle: 'A Dystopian Masterpiece',
      authors: ['George Orwell'],
      publisher: 'Signet Classic',
      publicationYear: '1961',
      edition: 'Classic Reissue',
      isbn: '9780451524935',
      language: 'en',
      pageCount: 328,
      category: 'literature',
      subcategory: 'Dystopian & Political Fiction',
      tags: ['dystopia', 'politics', 'classic', 'orwell'],
      location: { room: 'Main Library', cabinet: 'Cabinet 2', shelf: 'Shelf 1' },
      physicalCondition: 'used',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 328,
      isFavorite: true,
      rating: 5,
      review: 'Chillingly prophetic. The invention of Newspeak, Big Brother, and the manipulation of truth remains eternally relevant.',
      quotes: [
        { id: 'qe2', text: 'Who controls the past controls the future. Who controls the present controls the past.', page: 37 },
        { id: 'qe3', text: 'War is peace. Freedom is slavery. Ignorance is strength.', page: 6 }
      ],
      purchasePrice: 12,
      currency: 'USD',
      collections: ['Classics', 'Dystopian'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_en_3',
      title: 'Dune',
      subtitle: 'Book One of the Dune Chronicles',
      authors: ['Frank Herbert'],
      publisher: 'Ace Books',
      publicationYear: '2019',
      edition: 'Deluxe Hardcover',
      isbn: '9780441013593',
      language: 'en',
      pageCount: 688,
      category: 'literature',
      subcategory: 'Science Fiction Epic',
      tags: ['sci-fi', 'space epic', 'dune', 'ecology'],
      location: { room: 'Main Library', cabinet: 'Cabinet 3', shelf: 'Shelf 2' },
      physicalCondition: 'new',
      binding: 'hardcover',
      copies: 1,
      status: 'reading',
      currentPage: 412,
      startDate: '2026-03-20',
      isFavorite: true,
      rating: 5,
      review: 'A magnificent world-building tour-de-force intertwining ecology, politics, religion, and human evolution on Arrakis.',
      series: { name: 'Dune Chronicles', volume: '1' },
      quotes: [
        { id: 'qe4', text: 'I must not fear. Fear is the mind-killer. Fear is the little-death that brings total obliteration.', page: 22 }
      ],
      purchasePrice: 35,
      currency: 'USD',
      collections: ['Sci-Fi Sanctuary'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_en_4',
      title: 'Thinking, Fast and Slow',
      subtitle: '',
      authors: ['Daniel Kahneman'],
      publisher: 'Farrar, Straus and Giroux',
      publicationYear: '2013',
      edition: '1st Paperback',
      isbn: '9780374533557',
      language: 'en',
      pageCount: 512,
      category: 'psychology',
      subcategory: 'Behavioral Economics & Cognition',
      tags: ['psychology', 'decision making', 'economics', 'nobel'],
      location: { room: 'Main Library', cabinet: 'Cabinet 3', shelf: 'Shelf 1' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 512,
      rating: 4.5,
      review: 'Essential reading on cognitive biases, heuristics, System 1 intuition vs System 2 deliberative thought.',
      quotes: [
        { id: 'qe5', text: 'A reliable way to make people believe in falsehoods is frequent repetition, because familiarity is not easily distinguished from truth.', page: 62 }
      ],
      purchasePrice: 18,
      currency: 'USD',
      collections: ['Must Read', 'Mind & Psychology'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_en_5',
      title: 'The Hobbit',
      subtitle: 'There and Back Again',
      authors: ['J.R.R. Tolkien'],
      publisher: 'Houghton Mifflin Harcourt',
      publicationYear: '2012',
      edition: 'Illustrated Edition',
      isbn: '9780547928227',
      language: 'en',
      pageCount: 320,
      category: 'literature',
      subcategory: 'High Fantasy',
      tags: ['fantasy', 'tolkien', 'middle-earth', 'adventure'],
      location: { room: 'Main Library', cabinet: 'Cabinet 2', shelf: 'Shelf 3' },
      physicalCondition: 'good',
      binding: 'hardcover',
      copies: 1,
      status: 'finished',
      currentPage: 320,
      isFavorite: true,
      rating: 5,
      review: 'Pure joy and warmth. Bilbo Baggins stepping outside his cozy Hobbit-hole into the grand wilderness of Middle-earth.',
      quotes: [
        { id: 'qe6', text: 'Do you wish me a good morning, or mean that it is a good morning whether I want it or not?', page: 4 }
      ],
      purchasePrice: 24,
      currency: 'USD',
      series: { name: 'Middle-earth Legendarium', volume: '0' },
      collections: ['Classics', 'Fantasy Gems'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_en_6',
      title: 'Sapiens: A Brief History of Humankind',
      subtitle: '',
      authors: ['Yuval Noah Harari'],
      publisher: 'Harper',
      publicationYear: '2015',
      edition: '1st US Edition',
      isbn: '9780062316097',
      language: 'en',
      pageCount: 464,
      category: 'history',
      subcategory: 'Anthropology & World History',
      tags: ['anthropology', 'evolution', 'history', 'civilization'],
      location: { room: 'Main Library', cabinet: 'Cabinet 1', shelf: 'Shelf 2' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 464,
      rating: 4.5,
      review: 'Engaging, big-picture narrative of how Homo sapiens came to dominate earth through shared myths and fictions.',
      quotes: [
        { id: 'qe7', text: 'You could never convince a monkey to give you a banana by promising him limitless bananas after death in monkey heaven.', page: 24 }
      ],
      purchasePrice: 20,
      currency: 'USD',
      collections: ['Must Read'],
      loan: {
        isLoaned: true,
        borrower: 'Sarah Jenkins',
        loanDate: '2026-04-10',
        expectedReturn: '2026-05-01',
        notes: 'Lent for research paper'
      },
      isSample: true
    },
    {
      id: 'sample_en_7',
      title: 'Meditations',
      subtitle: 'A New Translation with Introduction by Gregory Hays',
      authors: ['Marcus Aurelius'],
      publisher: 'Modern Library',
      publicationYear: '2003',
      edition: 'Revised',
      isbn: '9780812968255',
      language: 'en',
      pageCount: 256,
      category: 'philosophy',
      subcategory: 'Stoicism & Ancient Philosophy',
      tags: ['stoicism', 'philosophy', 'rome', 'wisdom'],
      location: { room: 'Main Library', cabinet: 'Cabinet 1', shelf: 'Shelf 3' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 256,
      isFavorite: true,
      rating: 5,
      review: 'A Roman Emperor writing intimate reminders to himself on duty, mortality, tranquility, and resilience in adversity.',
      quotes: [
        { id: 'qe8', text: 'You have power over your mind - not outside events. Realize this, and you will find strength.', page: 48 },
        { id: 'qe9', text: 'Waste no more time arguing what a good man should be. Be one.', page: 94 }
      ],
      purchasePrice: 14,
      currency: 'USD',
      collections: ['Mind & Psychology', 'Classics'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_en_8',
      title: 'Clean Code',
      subtitle: 'A Handbook of Agile Software Craftsmanship',
      authors: ['Robert C. Martin'],
      publisher: 'Prentice Hall',
      publicationYear: '2008',
      edition: '1st Edition',
      isbn: '9780132350884',
      language: 'en',
      pageCount: 464,
      category: 'technology',
      subcategory: 'Software Engineering',
      tags: ['programming', 'software craft', 'refactoring', 'tech'],
      location: { room: 'Study Room', cabinet: 'Tech Shelf A', shelf: 'Shelf 1' },
      physicalCondition: 'used',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 464,
      rating: 4,
      review: 'Classic guide on naming, function simplicity, error handling, and writing code that humans can read.',
      quotes: [
        { id: 'qe10', text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', page: 14 }
      ],
      purchasePrice: 45,
      currency: 'USD',
      collections: ['Computer Science'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_en_9',
      title: 'Cosmos',
      subtitle: 'The Story of Cosmic Evolution, Science and Civilization',
      authors: ['Carl Sagan'],
      publisher: 'Ballantine Books',
      publicationYear: '2013',
      edition: 'Reissue Edition',
      isbn: '9780345539434',
      language: 'en',
      pageCount: 432,
      category: 'science',
      subcategory: 'Astronomy & Astrophysics',
      tags: ['astronomy', 'science', 'universe', 'sagan'],
      location: { room: 'Main Library', cabinet: 'Cabinet 3', shelf: 'Shelf 3' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'unread',
      currentPage: 0,
      rating: 5,
      review: 'Poetic, inspiring, and profound journey across the stars and humanity’s awakening in the cosmos.',
      quotes: [
        { id: 'qe11', text: 'The cosmos is within us. We are made of star-stuff. We are a way for the cosmos to know itself.', page: 18 }
      ],
      purchasePrice: 19,
      currency: 'USD',
      collections: ['Science Corner'],
      loan: { isLoaned: false },
      isSample: true
    },
    {
      id: 'sample_en_10',
      title: 'The Great Gatsby',
      subtitle: '',
      authors: ['F. Scott Fitzgerald'],
      publisher: 'Scribner',
      publicationYear: '2004',
      edition: 'Definitive Edition',
      isbn: '9780743273565',
      language: 'en',
      pageCount: 180,
      category: 'literature',
      subcategory: 'American Modernism',
      tags: ['roaring twenties', 'american dream', 'classic'],
      location: { room: 'Main Library', cabinet: 'Cabinet 2', shelf: 'Shelf 2' },
      physicalCondition: 'good',
      binding: 'paperback',
      copies: 1,
      status: 'finished',
      currentPage: 180,
      rating: 4.5,
      review: 'Lyrical prose exploring obsession, illusion, and the tragic green light at the end of Daisy’s dock.',
      quotes: [
        { id: 'qe12', text: 'So we beat on, boats against the current, borne back ceaselessly into the past.', page: 180 }
      ],
      purchasePrice: 12,
      currency: 'USD',
      collections: ['Classics'],
      loan: { isLoaned: false },
      isSample: true
    }
  ];
}

/**
 * Seed initial sample books if database is fresh
 */
export async function seedSampleBooksIfEmpty() {
  const books = await getAllBooks(true);
  const samples = getSampleBooks();

  if (books.length === 0) {
    await saveBooksBatch(samples);
    await createSnapshot('Initial Sample Library');
    return samples.length;
  }

  // Ensure Dr. Ahmed Khaled Tawfik's 5 books are added if missing
  const aktBooks = samples.filter(s => s.id.startsWith('sample_akt_'));
  const missingAkt = aktBooks.filter(akt => !books.some(b => b.title === akt.title));
  if (missingAkt.length > 0) {
    await saveBooksBatch(missingAkt);
    return missingAkt.length;
  }

  return 0;
}
