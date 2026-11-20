/**
 * map.js - Visual Library Blueprint Map
 * Interactive architectural hierarchy: Rooms > Cabinets > Shelves.
 * Clicking any shelf instantly takes the user to browse books on that exact shelf.
 */

import { getAllBooks } from '../db.js';
import { t, isRTL, formatNumber } from '../i18n.js';

export async function renderMapView(container, navigateTo) {
  const books = await getAllBooks();

  // Build hierarchy tree: Room -> Cabinet -> Shelf -> Books
  const mapTree = new Map();
  books.forEach(b => {
    const room = (b.location && b.location.room) || 'Main Library';
    const cabinet = (b.location && b.location.cabinet) || 'Cabinet 1';
    const shelf = (b.location && b.location.shelf) || 'Shelf 1';

    if (!mapTree.has(room)) mapTree.set(room, new Map());
    const cabMap = mapTree.get(room);

    if (!cabMap.has(cabinet)) cabMap.set(cabinet, new Map());
    const shelfMap = cabMap.get(cabinet);

    if (!shelfMap.has(shelf)) shelfMap.set(shelf, []);
    shelfMap.get(shelf).push(b);
  });

  const roomsList = Array.from(mapTree.entries());

  container.innerHTML = `
    <div class="view-container">
      <div style="margin-bottom: var(--space-lg);">
        <h2 style="color: var(--accent-gold); margin: 0;">🗺️ ${t('mapTitle')}</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
          ${t('mapHelp')}
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: var(--space-xl);">
        ${roomsList.map(([roomName, cabMap]) => `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: var(--space-lg); box-shadow: var(--card-shadow);">
            <div style="display: flex; align-items: center; gap: var(--space-sm); border-bottom: 2px solid var(--border-color-subtle); padding-bottom: var(--space-sm); margin-bottom: var(--space-md);">
              <span style="font-size: 1.5rem;">🏛️</span>
              <div>
                <h3 style="font-size: 1.3rem; color: var(--accent-gold); margin: 0;">${escapeHtml(roomName)}</h3>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${formatNumber(cabMap.size)} cabinets</span>
              </div>
            </div>

            <!-- Cabinets Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-lg);">
              ${Array.from(cabMap.entries()).map(([cabName, shelfMap]) => `
                <div style="background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: var(--radius-md); padding: var(--space-md); box-shadow: inset 0 2px 6px rgba(0,0,0,0.2);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
                    <strong style="color: var(--text-primary); font-size: 1rem;">🚪 ${escapeHtml(cabName)}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${formatNumber(shelfMap.size)} shelves</span>
                  </div>

                  <!-- Shelves inside Cabinet -->
                  <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
                    ${Array.from(shelfMap.entries()).map(([shelfName, shelfBooks]) => {
                      const shelfKey = `${roomName} > ${cabName} > ${shelfName}`;
                      return `
                        <div class="stat-card shelf-map-row" data-shelf-key="${escapeHtml(shelfKey)}" style="padding: 10px 14px; cursor: pointer; transition: transform var(--transition-fast); background: var(--bg-surface);">
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.9rem; font-weight: 600; color: var(--accent-gold);">
                              📖 ${escapeHtml(shelfName)}
                            </span>
                            <span class="badge badge-reading">
                              ${t('booksCount', { count: formatNumber(shelfBooks.length) })}
                            </span>
                          </div>
                          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHtml(shelfBooks.map(b => b.title).slice(0, 3).join(' • '))}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Tapping a shelf filters the library screen
  container.querySelectorAll('.shelf-map-row').forEach(row => {
    row.addEventListener('click', () => {
      const shelfKey = row.dataset.shelfKey;
      navigateTo('library', { shelfFilter: shelfKey });
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
