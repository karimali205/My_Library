/**
 * authors.js - Authors Directory View
 * Lists all authors with book counts, filtering, and direct links to their books.
 */

import { getAllBooks } from '../db.js';
import { t, isRTL, normalizeArabic, formatNumber } from '../i18n.js';

export async function renderAuthorsView(container, navigateTo) {
  const books = await getAllBooks();
  
  // Group books by author
  const authorMap = new Map();
  books.forEach(book => {
    (book.authors || []).forEach(author => {
      const a = author.trim();
      if (!a) return;
      if (!authorMap.has(a)) authorMap.set(a, []);
      authorMap.get(a).push(book);
    });
  });

  const sortedAuthors = Array.from(authorMap.entries()).sort((a, b) => {
    return b[1].length - a[1].length || a[0].localeCompare(b[0]);
  });

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: var(--space-lg); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-sm);">
        <div>
          <h2 style="color: var(--accent-gold); margin: 0;">✍️ ${t('authorsTitle')}</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
            ${formatNumber(sortedAuthors.length)} ${t('authors')}
          </p>
        </div>
        <input type="text" id="authors-search-input" class="form-control" placeholder="${t('search')}..." style="max-width: 250px;">
      </div>

      <div class="books-grid" id="authors-grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));">
        <!-- Author cards mount -->
      </div>
    </div>
  `;

  const gridEl = container.querySelector('#authors-grid');
  const searchInput = container.querySelector('#authors-search-input');

  function renderList(query = '') {
    const norm = normalizeArabic(query);
    const filtered = sortedAuthors.filter(([author]) => {
      return !norm || normalizeArabic(author).includes(norm);
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: var(--space-xl);">${t('noData')}</div>`;
      return;
    }

    gridEl.innerHTML = filtered.map(([author, authorBooks]) => `
      <div class="stat-card author-card" data-author="${escapeHtml(author)}" style="cursor: pointer; padding: var(--space-md); transition: transform var(--transition-fast);">
        <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xs);">
          <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: var(--bg-surface-elevated); border: 1px solid var(--accent-gold); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: var(--accent-gold);">
            ✍️
          </div>
          <div style="min-width: 0; flex: 1;">
            <h4 style="font-size: 0.95rem; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(author)}</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              ${t('booksCount', { count: formatNumber(authorBooks.length) })}
            </span>
          </div>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.3; max-height: 40px; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(authorBooks.map(b => b.title).slice(0, 3).join(' • '))}
        </div>
      </div>
    `).join('');

    gridEl.querySelectorAll('.author-card').forEach(card => {
      card.addEventListener('click', () => {
        const author = card.dataset.author;
        // Search in library
        navigateTo('library');
        setTimeout(() => {
          const libSearch = document.querySelector('#lib-search-input');
          if (libSearch) {
            libSearch.value = author;
            libSearch.dispatchEvent(new Event('input'));
          }
        }, 100);
      });
    });
  }

  searchInput.addEventListener('input', (e) => renderList(e.target.value));
  renderList();
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
