/**
 * csv-excel.js - CSV and JSON Import/Export with column mapping and duplicate analysis
 */

import { sanitizeBook } from '../models.js';

export function exportBooksToCSV(books) {
  const headers = [
    'Title',
    'Subtitle',
    'Authors',
    'ISBN',
    'Publisher',
    'Publication Year',
    'Language',
    'Category',
    'Subcategory',
    'Page Count',
    'Status',
    'Current Page',
    'Rating',
    'Room',
    'Cabinet',
    'Shelf',
    'Condition',
    'Binding',
    'Tags',
    'Collections',
    'Series Name',
    'Series Volume',
    'Purchase Price',
    'Currency',
    'Is Favorite',
    'Review'
  ];

  const rows = books.map(b => {
    return [
      escapeCSVField(b.title),
      escapeCSVField(b.subtitle || ''),
      escapeCSVField((b.authors || []).join('; ')),
      escapeCSVField(b.isbn || ''),
      escapeCSVField(b.publisher || ''),
      escapeCSVField(b.publicationYear || ''),
      escapeCSVField(b.language || 'en'),
      escapeCSVField(b.category || ''),
      escapeCSVField(b.subcategory || ''),
      b.pageCount || '',
      escapeCSVField(b.status || 'unread'),
      b.currentPage || 0,
      b.rating || 0,
      escapeCSVField((b.location && b.location.room) || ''),
      escapeCSVField((b.location && b.location.cabinet) || ''),
      escapeCSVField((b.location && b.location.shelf) || ''),
      escapeCSVField(b.physicalCondition || 'good'),
      escapeCSVField(b.binding || 'paperback'),
      escapeCSVField((b.tags || []).join('; ')),
      escapeCSVField((b.collections || []).join('; ')),
      escapeCSVField((b.series && b.series.name) || ''),
      escapeCSVField((b.series && b.series.volume) || ''),
      b.purchasePrice || '',
      escapeCSVField(b.currency || 'USD'),
      b.isFavorite ? 'Yes' : 'No',
      escapeCSVField(b.review || '')
    ].join(',');
  });

  // UTF-8 BOM for Excel Arabic / international character support
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  return csvContent;
}

function escapeCSVField(str) {
  if (str === null || str === undefined) return '""';
  const s = String(str).replace(/"/g, '""');
  return `"${s}"`;
}

/**
 * Robust CSV parser supporting quotes, commas inside quotes, multiline values
 */
export function parseCSV(text) {
  // Strip BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const lines = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(current.trim());
      current = '';
      if (row.some(val => val !== '')) {
        lines.push(row);
      }
      row = [];
    } else {
      current += char;
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(val => val !== '')) {
      lines.push(row);
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0];
  const dataRows = lines.slice(1);
  return { headers, rows: dataRows };
}

/**
 * Map raw CSV rows into standardized Book models using user's column mappings
 */
export function mapRowsToBooks(headers, rows, mapping) {
  const books = [];
  const errors = [];

  rows.forEach((row, rowIndex) => {
    try {
      const rowObj = {};
      headers.forEach((h, i) => {
        rowObj[h] = row[i] || '';
      });

      const titleKey = mapping.title;
      const title = rowObj[titleKey] || '';
      if (!title) {
        errors.push(`Row ${rowIndex + 2}: Missing Title`);
        return;
      }

      const authorsRaw = rowObj[mapping.authors] || '';
      const authors = authorsRaw
        ? authorsRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean)
        : [];

      const tagsRaw = rowObj[mapping.tags] || '';
      const tags = tagsRaw
        ? tagsRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean)
        : [];

      const book = sanitizeBook({
        title,
        subtitle: rowObj[mapping.subtitle] || '',
        authors,
        isbn: rowObj[mapping.isbn] || '',
        publisher: rowObj[mapping.publisher] || '',
        publicationYear: rowObj[mapping.publicationYear] || '',
        language: rowObj[mapping.language] || (isArabic(title) ? 'ar' : 'en'),
        category: rowObj[mapping.category] || 'general',
        subcategory: rowObj[mapping.subcategory] || '',
        pageCount: rowObj[mapping.pageCount] ? parseInt(rowObj[mapping.pageCount], 10) : null,
        status: (rowObj[mapping.status] || 'unread').toLowerCase(),
        rating: rowObj[mapping.rating] ? parseFloat(rowObj[mapping.rating]) : 0,
        review: rowObj[mapping.review] || '',
        tags,
        location: {
          room: rowObj[mapping.room] || 'Main Library',
          cabinet: rowObj[mapping.cabinet] || 'Cabinet 1',
          shelf: rowObj[mapping.shelf] || 'Shelf 1'
        },
        physicalCondition: rowObj[mapping.condition] || 'good',
        binding: rowObj[mapping.binding] || 'paperback',
        purchasePrice: rowObj[mapping.purchasePrice] ? parseFloat(rowObj[mapping.purchasePrice]) : null,
        currency: rowObj[mapping.currency] || 'USD'
      });

      books.push(book);
    } catch (err) {
      errors.push(`Row ${rowIndex + 2}: ${err.message}`);
    }
  });

  return { books, errors };
}

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text || '');
}

/**
 * Triggers browser download for string data
 */
export function downloadFile(content, fileName, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
