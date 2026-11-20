/**
 * series.js - Series & Multi-Volume Cycles View
 * Displays series grouped by name, highlights owned volumes,
 * and automatically detects missing volume numbers.
 */

import { getAllBooks } from '../db.js';
import { t, isRTL, formatNumber } from '../i18n.js';

export async function renderSeriesView(container, navigateTo) {
  const books = await getAllBooks();

  // Group books by series name
  const seriesMap = new Map();
  books.forEach(b => {
    if (b.series && b.series.name) {
      const sName = b.series.name.trim();
      if (!seriesMap.has(sName)) seriesMap.set(sName, []);
      seriesMap.get(sName).push(b);
    }
  });

  const seriesList = Array.from(seriesMap.entries()).map(([name, seriesBooks]) => {
    // Sort by volume number
    seriesBooks.sort((a, b) => {
      const vA = parseFloat(a.series.volume) || 0;
      const vB = parseFloat(b.series.volume) || 0;
      return vA - vB;
    });

    const ownedVolumes = seriesBooks
      .map(b => parseFloat(b.series.volume))
      .filter(n => !isNaN(n) && n > 0);

    let maxVol = ownedVolumes.length > 0 ? Math.max(...ownedVolumes) : seriesBooks.length;
    const missing = [];
    for (let i = 1; i <= maxVol; i++) {
      if (!ownedVolumes.includes(i)) {
        missing.push(i);
      }
    }

    return {
      name,
      books: seriesBooks,
      maxVol,
      missing,
      isComplete: missing.length === 0 && seriesBooks.length > 1
    };
  });

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: var(--space-lg);">
        <h2 style="color: var(--accent-gold); margin: 0;">📚 ${t('seriesTitle')}</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
          ${formatNumber(seriesList.length)} series tracked
        </p>
      </div>

      ${seriesList.length === 0 ? `
        <div style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
          <p>No series defined yet. Add a series name and volume number to any book to track it here!</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: var(--space-lg);">
          ${seriesList.map(s => `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-lg); box-shadow: var(--card-shadow);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); flex-wrap: wrap; gap: var(--space-xs);">
                <div>
                  <h3 style="font-size: 1.25rem; color: var(--accent-gold); margin: 0;">${escapeHtml(s.name)}</h3>
                  <span style="font-size: 0.8rem; color: var(--text-secondary);">
                    ${t('seriesVolumesOwned', { owned: formatNumber(s.books.length), total: formatNumber(s.maxVol) })}
                  </span>
                </div>
                ${s.isComplete ? `
                  <span class="badge badge-finished">✓ Complete Series</span>
                ` : (s.missing.length > 0 ? `
                  <span class="badge badge-reading">⚠️ ${t('missingVolumes')} ${s.missing.join(', ')}</span>
                ` : '')}
              </div>

              <!-- Books in series -->
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-md);">
                ${s.books.map(b => `
                  <div class="stat-card" data-book-id="${b.id}" style="cursor: pointer; padding: var(--space-sm);">
                    <div style="font-size: 0.75rem; color: var(--accent-gold); font-weight: bold; margin-bottom: 2px;">
                      Vol ${escapeHtml(b.series.volume || '?')}
                    </div>
                    <h4 style="font-size: 0.85rem; margin: 0 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(b.title)}</h4>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">${(b.authors || []).join(', ')}</p>
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
