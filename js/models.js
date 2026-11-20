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
    currency: 'USD',
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
  { id: 'literature', en: 'Literature & Fiction', ar: 'الأدب والرواية' },
  { id: 'history', en: 'History & Civilization', ar: 'التاريخ والحضارة' },
  { id: 'philosophy', en: 'Philosophy & Thought', ar: 'الفلسفة والفكر' },
  { id: 'religion', en: 'Religion & Theology', ar: 'العلوم الدينية والشرعية' },
  { id: 'science', en: 'Science & Nature', ar: 'العلوم والطبيعة' },
  { id: 'psychology', en: 'Psychology & Self-Help', ar: 'علم النفس وتطوير الذات' },
  { id: 'arts', en: 'Arts & Architecture', ar: 'الفنون والعمارة' },
  { id: 'politics', en: 'Politics & Economics', ar: 'السياسة والاقتصاد' },
  { id: 'biography', en: 'Biography & Memoirs', ar: 'السير والتراجم' },
  { id: 'poetry', en: 'Poetry', ar: 'الشعر والقصائد' },
  { id: 'technology', en: 'Technology & Computing', ar: 'التكنولوجيا والحاسوب' },
  { id: 'general', en: 'General Reference', ar: 'المعارف العامة والموسوعات' }
];

export const CATEGORY_COLORS = {
  'literature': '#8b263e',
  'history': '#9c5932',
  'philosophy': '#3d5a80',
  'religion': '#1b4332',
  'science': '#2b7a78',
  'psychology': '#6d597a',
  'arts': '#b56576',
  'politics': '#7f4f24',
  'biography': '#4f772d',
  'poetry': '#582f0e',
  'technology': '#1d3557',
  'general': '#495057'
};

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
