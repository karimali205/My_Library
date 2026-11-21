/**
 * spine-generator.js - Generates elegant book spines and covers dynamically
 * with foil lettering, ribs, decorative borders, and category-derived leather colors.
 */

import { getCategoryColor } from '../models.js';

// Rich, authentic library leather bindings palette
const LEATHER_PALETTE = [
  '#5c241c', // Crimson Burgundy
  '#1b3d2f', // Forest Emerald
  '#1c2d4a', // Midnight Navy
  '#4a2c11', // Classic Saddle Mahogany
  '#632f1b', // Warm Russet / Terracotta
  '#2a201c', // Dark Roast Espresso
  '#3d2314', // Antique Chestnut
  '#253529', // Deep Olive Green
  '#3d2138', // Imperial Plum
  '#523624', // Warm Cocoa Leather
  '#243342', // Slate Leather
  '#68411b', // Cognac Leather
  '#22393d', // Deep Teal
  '#501c27'  // Deep Maroon
];

export function getBookLeatherColor(book) {
  if (book.coverColor) return book.coverColor;
  let hash = 0;
  const str = (book.id || '') + (book.title || '') + (book.category || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return LEATHER_PALETTE[Math.abs(hash) % LEATHER_PALETTE.length];
}

/**
 * Generate a book spine element for the wooden bookshelf
 */
export function createSpineElement(book, options = {}) {
  const isArabic = book.language === 'ar' || /[\u0600-\u06FF]/.test(book.title);
  const baseColor = getBookLeatherColor(book);
  const statusRibbon = getStatusRibbonClass(book.status);

  // Derive subtle gradient variations
  const spineEl = document.createElement('div');
  spineEl.className = `book-spine ${statusRibbon}`;
  spineEl.setAttribute('role', 'button');
  spineEl.setAttribute('tabindex', '0');
  spineEl.setAttribute('aria-label', `${book.title} - ${(book.authors || []).join(', ')}`);
  spineEl.dataset.bookId = book.id;

  // Uniform, balanced spine dimensions for consistent, elegant shelf alignment
  const heightScale = 1.0;
  const widthFactor = 1.0;

  spineEl.style.setProperty('--spine-color', baseColor);
  spineEl.style.setProperty('--spine-height-scale', heightScale);
  spineEl.style.setProperty('--spine-width-scale', widthFactor);

  // Determine dynamic font scaling based on title length
  const titleLen = (book.title || '').length;
  let titleFontSize = '0.94rem';
  if (titleLen > 36) {
    titleFontSize = '0.74rem';
  } else if (titleLen > 24) {
    titleFontSize = '0.80rem';
  } else if (titleLen > 16) {
    titleFontSize = '0.86rem';
  }
  spineEl.style.setProperty('--title-font-size', titleFontSize);

  // Full title without truncation
  const displayTitle = book.title || 'بدون عنوان';
  const authorText = (book.authors && book.authors.length > 0) ? book.authors[0] : '';
  // Only display author on the vertical spine if title is concise (under 22 chars)
  const showAuthorOnSpine = Boolean(authorText && titleLen <= 22);

  spineEl.innerHTML = `
    <div class="spine-texture"></div>
    <div class="spine-rib top-rib"></div>
    <div class="spine-rib subtop-rib"></div>
    
    <div class="spine-content ${isArabic ? 'lang-ar' : 'lang-en'}">
      <div class="spine-ornament top-ornament">✦</div>
      <div class="spine-title" title="${escapeHtml(book.title)}">${escapeHtml(displayTitle)}</div>
      ${showAuthorOnSpine ? `<div class="spine-author" title="${escapeHtml(authorText)}">${escapeHtml(authorText)}</div>` : ''}
      <div class="spine-ornament bottom-ornament">✦</div>
    </div>

    <div class="spine-tooltip">
      <div class="spine-tip-title">${escapeHtml(book.title)}</div>
      ${authorText ? `<div class="spine-tip-author">${escapeHtml(authorText)}</div>` : ''}
      ${book.category ? `<div class="spine-tip-cat">${escapeHtml(book.category)}</div>` : ''}
    </div>

    <div class="spine-rib subbottom-rib"></div>
    <div class="spine-rib bottom-rib"></div>
    ${book.status === 'reading' ? '<div class="spine-bookmark"></div>' : ''}
    ${book.isFavorite ? '<div class="spine-fav-seal" title="Favorite">★</div>' : ''}
    ${book.loan && book.loan.isLoaned ? '<div class="spine-loan-tag" title="On Loan">⚲</div>' : ''}
  `;

  return spineEl;
}

/**
 * Generate a book cover card (used when no uploaded cover is present)
 */
export function createStyledCoverHTML(book, size = 'medium') {
  const isArabic = book.language === 'ar' || /[\u0600-\u06FF]/.test(book.title);
  const baseColor = getCategoryColor(book.category);
  const displayTitle = book.title || 'Untitled';
  const authorText = (book.authors && book.authors.length > 0) ? book.authors.join(' • ') : '';

  return `
    <div class="styled-virtual-cover ${size} ${isArabic ? 'lang-ar' : 'lang-en'}" style="--cover-base-color: ${baseColor};">
      <div class="cover-filigree-frame">
        <div class="cover-corner top-left"></div>
        <div class="cover-corner top-right"></div>
        <div class="cover-corner bottom-left"></div>
        <div class="cover-corner bottom-right"></div>
        
        <div class="cover-header">
          <span class="cover-emblem">❦</span>
        </div>
        
        <div class="cover-center">
          <h4 class="cover-title">${escapeHtml(displayTitle)}</h4>
          ${book.subtitle ? `<p class="cover-subtitle">${escapeHtml(book.subtitle)}</p>` : ''}
        </div>

        <div class="cover-footer">
          <div class="cover-divider"></div>
          <p class="cover-author">${escapeHtml(authorText)}</p>
          ${book.publisher ? `<span class="cover-publisher">${escapeHtml(book.publisher)}</span>` : ''}
        </div>
      </div>
      <div class="cover-leather-sheen"></div>
    </div>
  `;
}

function getStatusRibbonClass(status) {
  switch (status) {
    case 'reading': return 'status-reading';
    case 'finished': return 'status-finished';
    case 'paused': return 'status-paused';
    default: return 'status-unread';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
