/**
 * spine-generator.js - Generates elegant book spines and covers dynamically
 * with foil lettering, ribs, decorative borders, and category-derived leather colors.
 */

import { getCategoryColor } from '../models.js';

/**
 * Generate a book spine element for the wooden bookshelf
 */
export function createSpineElement(book, options = {}) {
  const isArabic = book.language === 'ar' || /[\u0600-\u06FF]/.test(book.title);
  const baseColor = getCategoryColor(book.category);
  const statusRibbon = getStatusRibbonClass(book.status);

  // Derive subtle gradient variations
  const spineEl = document.createElement('div');
  spineEl.className = `book-spine ${statusRibbon}`;
  spineEl.setAttribute('role', 'button');
  spineEl.setAttribute('tabindex', '0');
  spineEl.setAttribute('aria-label', `${book.title} - ${book.authors.join(', ')}`);
  spineEl.dataset.bookId = book.id;

  // Book thickness / height variation based on page count or random seed
  const pages = book.pageCount || 300;
  const heightScale = Math.min(1.08, Math.max(0.85, 0.88 + (pages % 50) * 0.004));
  const widthFactor = Math.min(1.4, Math.max(0.75, 0.65 + (pages / 650)));

  spineEl.style.setProperty('--spine-color', baseColor);
  spineEl.style.setProperty('--spine-height-scale', heightScale.toFixed(2));
  spineEl.style.setProperty('--spine-width-scale', widthFactor.toFixed(2));

  // Determine title text
  const displayTitle = book.title.length > 40 ? book.title.slice(0, 38) + '…' : book.title;
  const authorText = (book.authors && book.authors.length > 0) ? book.authors[0] : '';
  const displayAuthor = authorText.length > 25 ? authorText.slice(0, 23) + '…' : authorText;

  spineEl.innerHTML = `
    <div class="spine-texture"></div>
    <div class="spine-rib top-rib"></div>
    <div class="spine-rib subtop-rib"></div>
    
    <div class="spine-content ${isArabic ? 'lang-ar' : 'lang-en'}">
      <div class="spine-ornament top-ornament">✦</div>
      <div class="spine-title">${escapeHtml(displayTitle)}</div>
      ${displayAuthor ? `<div class="spine-author">${escapeHtml(displayAuthor)}</div>` : ''}
      <div class="spine-ornament bottom-ornament">✦</div>
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
