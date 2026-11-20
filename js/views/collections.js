/**
 * collections.js - Custom Collections & Anthologies View
 */

import { getAllBooks } from '../db.js';
import { t, isRTL, formatNumber } from '../i18n.js';
import { createStyledCoverHTML } from '../utils/spine-generator.js';

export async function renderCollectionsView(container, navigateTo) {
  const books = await getAllBooks();

  const collectionMap = new Map();
  books.forEach(b => {
    (b.collections || []).forEach(col => {
      const c = col.trim();
      if (!c) return;
      if (!collectionMap.has(c)) collectionMap.set(c, []);
      collectionMap.get(c).push(b);
    });
  });

  const collections = Array.from(collectionMap.entries()).sort((a, b) => b[1].length - a[1].length);

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: var(--space-lg);">
        <h2 style="color: var(--accent-gold); margin: 0;">📁 ${t('collectionsTitle')}</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
          ${formatNumber(collections.length)} collections
        </p>
      </div>

      ${collections.length === 0 ? `
        <div style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
          <p>No collections created yet. Add collections (e.g. "Heritage", "Dad's Books") to any book to organize them here!</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: var(--space-lg);">
          ${collections.map(([colName, colBooks]) => `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-lg); box-shadow: var(--card-shadow);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
                <h3 style="font-size: 1.2rem; color: var(--accent-gold); margin: 0;">
                  📂 ${escapeHtml(colName)}
                </h3>
                <span class="badge badge-reading">${t('booksCount', { count: formatNumber(colBooks.length) })}</span>
              </div>

              <div class="books-grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
                ${colBooks.map(b => `
                  <div class="book-card" data-book-id="${b.id}">
                    <div class="book-card-cover-container">
                      ${b.coverImage ? `<img src="${b.coverImage}" alt="${escapeHtml(b.title)}" class="book-card-cover-img">` : createStyledCoverHTML(b, 'small')}
                    </div>
                    <div class="book-card-body">
                      <h4 class="book-card-title">${escapeHtml(b.title)}</h4>
                      <p class="book-card-author">${escapeHtml((b.authors || []).join(', '))}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  container.querySelectorAll('[data-book-id]').forEach(el => {
    el.addEventListener('click', () => {
      navigateTo('book-details', { bookId: el.dataset.bookId });
    });
  });
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
