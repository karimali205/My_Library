/**
 * models.js - Data models, validation, and schema definitions
 */

export function createEmptyBook() {
  const now = new Date().toISOString();
  return {
    id: 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    title: '',
    subtitle: '',
    authors: [],
    translator: '',
    editor: '',
    publisher: '',
    publicationYear: '',
    edition: '',
    isbn: '',
    language: 'ar',
    pageCount: null,
    category: 'Literature',
    subcategory: '',
    tags: [],
    coverImage: '', // Data URL or external URL
    
    // Physical location
    location: {
      room: 'Main Library',
      cabinet: 'Cabinet 1',
      shelf: 'Shelf 1'
    },
    physicalCondition: 'good', // 'new' | 'good' | 'used' | 'damaged'
    binding: 'paperback', // 'paperback' | 'hardcover'
    copies: 1,

    // Reading status & progress
    status: 'unread', // 'unread' | 'reading' | 'finished' | 'paused'
    currentPage: 0,
    startDate: '',
    finishDate: '',
    isFavorite: false,

    // Review & Notes
    rating: 0, // 0 - 5
    review: '',
    quotes: [], // Array of { id, text, page, dateAdded }

    // Acquisition & Value
    purchasePrice: null,
    currency: 'EGP',
    purchaseDate: '',
    purchasePlace: '',
    isGift: false,
    giverName: '',

    // Series & Collections
    series: {
      name: '',
      volume: ''
    },
    collections: [],

    // Loans
    loan: {
      isLoaned: false,
      borrower: '',
      loanDate: '',
      expectedReturn: '',
      notes: ''
    },
    loanHistory: [], // Array of { borrower, loanDate, returnDate, notes }

    // Custom fields & metadata
    customFields: {},
    isSample: false,
    deletedAt: null, // If set, book is in trash
    createdAt: now,
    updatedAt: now
  };
}

export function sanitizeBook(raw) {
  const base = createEmptyBook();
  const merged = { ...base, ...raw };
  
  // Ensure arrays
  if (typeof merged.authors === 'string') {
    merged.authors = merged.authors.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(merged.authors)) merged.authors = [];

  if (typeof merged.tags === 'string') {
    merged.tags = merged.tags.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(merged.tags)) merged.tags = [];

  if (typeof merged.collections === 'string') {
    merged.collections = merged.collections.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(merged.collections)) merged.collections = [];

  if (!Array.isArray(merged.quotes)) merged.quotes = [];
  if (!Array.isArray(merged.loanHistory)) merged.loanHistory = [];

  // Ensure location object
  if (!merged.location || typeof merged.location !== 'object') {
    merged.location = { room: 'Main Library', cabinet: 'Cabinet 1', shelf: 'Shelf 1' };
  }
  if (!merged.series || typeof merged.series !== 'object') {
    merged.series = { name: '', volume: '' };
  }
  if (!merged.loan || typeof merged.loan !== 'object') {
    merged.loan = { isLoaned: false, borrower: '', loanDate: '', expectedReturn: '', notes: '' };
  }

  // Ensure numeric types
  if (merged.pageCount !== null && merged.pageCount !== undefined && merged.pageCount !== '') {
    merged.pageCount = parseInt(merged.pageCount, 10) || null;
  }
  if (merged.currentPage) {
    merged.currentPage = parseInt(merged.currentPage, 10) || 0;
  }
  if (merged.rating) {
    merged.rating = parseFloat(merged.rating) || 0;
  }
  if (merged.copies) {
    merged.copies = parseInt(merged.copies, 10) || 1;
  }
  if (merged.purchasePrice) {
    merged.purchasePrice = parseFloat(merged.purchasePrice) || null;
  }

  return merged;
}

export const DEFAULT_CATEGORIES = [
  { id: 'arabic_literature', en: 'Arabic Literature & Novels', ar: 'الروايات والأدب العربي' },
  { id: 'translated_literature', en: 'Translated World Literature', ar: 'الأدب العالمي المترجم' },
  { id: 'psychology_development', en: 'Psychology & Self-Development', ar: 'علم النفس وتطوير الذات' },
  { id: 'islamic_studies', en: 'Islamic & Religious Studies', ar: 'الدراسات والعلوم الإسلامية' },
  { id: 'thought_philosophy', en: 'Thought & Philosophy', ar: 'الفكر والفلسفة' },
  { id: 'history_civilization', en: 'History & Civilization', ar: 'التاريخ والحضارة' },
  { id: 'science_knowledge', en: 'Science & General Knowledge', ar: 'العلوم والمعرفة العامة' },
  { id: 'politics_society', en: 'Politics & Society', ar: 'السياسة والمجتمع' }
];

export const CATEGORY_COLORS = {
  'arabic_literature': '#8b263e',
  'translated_literature': '#5c2a68',
  'psychology_development': '#7f4f24',
  'islamic_studies': '#1b4332',
  'thought_philosophy': '#2b4162',
  'history_civilization': '#8a4b2d',
  'science_knowledge': '#1e5f74',
  'politics_society': '#3a506b',
  'literature': '#8b263e',
  'history': '#8a4b2d',
  'philosophy': '#2b4162',
  'religion': '#1b4332',
  'science': '#1e5f74',
  'psychology': '#7f4f24',
  'general': '#495057'
};

export function getCategoryLabel(catId, lang = 'ar') {
  if (!catId) return '';
  const found = DEFAULT_CATEGORIES.find(c => c.id === catId || c.ar === catId || c.en.toLowerCase() === catId.toLowerCase());
  if (found) return lang === 'ar' ? found.ar : found.en;
  return catId;
}

export function getCategoryColor(categoryName) {
  if (!categoryName) return '#5c2c16';
  const norm = categoryName.toLowerCase();
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (norm.includes(key)) return color;
  }
  // Deterministic color from string hash
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 45%, 32%)`;
}
